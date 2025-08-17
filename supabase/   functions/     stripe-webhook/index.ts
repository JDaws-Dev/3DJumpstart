
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-11-20',
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const sig = req.headers.get('Stripe-Signature')!
  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    return new Response((err as Error).message, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const parentId = session.client_reference_id || null
    const meta = session.metadata || {}
    const students = JSON.parse(meta.students ?? '[]') as Array<{student_id:string, timeSlot:string}>
    const paidAmount = Number(meta.totalAmount ?? 0)

    // Insert into orders
    const { data: order } = await supabase.from('orders').insert({
      parent_id: parentId,
      payment_method: 'stripe',
      total_amount: paidAmount,
      amount_paid: paidAmount,
      status: 'paid',
      stripe_payment_intent_id: session.payment_intent ?? null,
      notes: 'Stripe Checkout'
    }).select().single()

    if (order) {
      // Order items
      await supabase.from('order_items').insert(
        students.map(s => ({
          order_id: order.id,
          student_id: s.student_id,
          time_slot: s.timeSlot,
          price: null
        }))
      )

      // Payments
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: paidAmount,
        payment_type: 'stripe',
        stripe_charge_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        status: 'succeeded',
        processed_at: new Date().toISOString()
      })

      // Map to class_slot_id
      const { data: slots } = await supabase.from('class_slots')
        .select('id, day_of_week, start_time, end_time')

      const toLabel = (t: string) => {
        const [hStr, mStr] = t.split(':')
        const h = Number(hStr), m = Number(mStr)
        const h12 = ((h + 11) % 12) + 1
        return `${h12}:${String(m).padStart(2,'0')}${h >= 12 ? 'pm' : 'am'}`
      }
      const label = (start: string, end: string) => `${toLabel(start)}-${toLabel(end)}`
      const map: Record<string, string> = {}
      for (const s of slots ?? []) {
        if (s.day_of_week !== 'Tuesday') continue
        const start = String(s.start_time).slice(0,5)
        const end = String(s.end_time).slice(0,5)
        map[label(start,end)] = s.id
      }

      await supabase.from('enrollments').insert(
        students.map(s => ({
          student_id: s.student_id,
          class_slot_id: map[s.timeSlot] ?? null,
          order_id: order.id,
          enrolled_at: new Date().toISOString(),
          status: 'enrolled',
          payment_status: 'paid'
        }))
      )
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})

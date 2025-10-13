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

// Email sending function
async function sendConfirmationEmail(parentEmail: string, studentNames: string[], classDetails: string[], totalAmount: number) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'

  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email')
    return
  }

  const studentList = studentNames.map((name, i) => `
    <li style="margin-bottom: 10px;">
      <strong>${name}</strong><br>
      <span style="color: #64748b;">${classDetails[i]}</span>
    </li>
  `).join('')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; color: #16a34a; margin-bottom: 10px;">✓</div>
        <h1 style="color: #0f172a; margin: 0; font-size: 28px;">Enrollment Confirmed!</h1>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Thank you for enrolling in <strong>3D Jumpstart</strong>! Your payment of <strong>$${totalAmount}</strong> has been processed successfully.
      </p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Enrolled Students:</h2>
        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
          ${studentList}
        </ul>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>What to Bring:</strong> Imperial (inch) Dial Calipers - <a href="https://a.co/d/7BT1kL0" style="color: #ea580c; text-decoration: none; font-weight: 600;">View on Amazon</a>
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
          All other materials will be provided.
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
          <strong>Location:</strong> Class location will be sent before the first class.
        </p>
      </div>

      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        You can view your enrollment details anytime in the <a href="https://3djumpstart.com/portal.html" style="color: #ea580c; text-decoration: none; font-weight: 600;">Parent Portal</a>.
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Questions? Contact us for any changes or support.<br>
          <a href="https://3djumpstart.com" style="color: #ea580c; text-decoration: none;">3djumpstart.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: parentEmail,
        subject: '✓ Your 3D Jumpstart Enrollment is Confirmed!',
        html: htmlContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error(`Resend API error: ${error}`)
    }

    const data = await response.json()
    console.log('Email sent successfully:', data.id)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

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
    const parentEmail = session.customer_email || null
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

      // Send confirmation email
      if (parentEmail && students.length > 0) {
        // Get student names
        const { data: studentData } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', students.map(s => s.student_id))

        if (studentData) {
          const studentNames = studentData.map(s => `${s.first_name} ${s.last_name}`)
          const classDetails = students.map(s => s.timeSlot)

          await sendConfirmationEmail(parentEmail, studentNames, classDetails, paidAmount)
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})

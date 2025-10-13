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
    console.error('Webhook signature verification failed:', err)
    return new Response((err as Error).message, { status: 400 })
  }

  console.log('Received event:', event.type)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const parentId = session.client_reference_id
    const metadata = session.metadata || {}
    const enrollmentIds = JSON.parse(metadata.enrollment_ids || '[]')
    const totalAmount = Number(metadata.total_amount || 0)

    console.log('Processing checkout for parent:', parentId)
    console.log('Enrollment IDs:', enrollmentIds)
    console.log('Total amount:', totalAmount)

    try {
      // Update enrollments from 'cart' to 'enrolled'
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({
          status: 'enrolled',
          balance_due: 0  // First week is paid
        })
        .in('id', enrollmentIds)
        .eq('status', 'cart')

      if (enrollError) {
        console.error('Failed to update enrollments:', enrollError)
        throw enrollError
      }

      console.log('Updated enrollments to enrolled status')

      // Record payment for each enrollment
      for (const enrollmentId of enrollmentIds) {
        const { error: paymentError } = await supabase.from('payments').insert({
          parent_id: parentId,
          enrollment_id: enrollmentId,
          amount: 40, // $40 per student for first week
          event_type: 'First Week',
          stripe_object_id: session.payment_intent?.toString() || session.id,
          created_at: new Date().toISOString()
        })

        if (paymentError) {
          console.error('Failed to record payment:', paymentError)
        }
      }

      console.log('Successfully processed payment and updated enrollments')

    } catch (err) {
      console.error('Error processing webhook:', err)
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})

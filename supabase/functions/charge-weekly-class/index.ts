// supabase/functions/charge-weekly-class/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-10-28.acacia',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { parent_id, enrollment_id, student_id, attendance_date, amount } = await req.json()

    if (!parent_id || !enrollment_id || !student_id || !attendance_date || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing weekly charge for parent:', parent_id)

    // Get parent's Stripe customer ID
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('stripe_customer_id, email, name')
      .eq('id', parent_id)
      .single()

    if (parentError || !parent) {
      return new Response(
        JSON.stringify({ error: 'Parent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!parent.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error: 'No payment method on file',
          message: 'Parent needs to complete initial enrollment with payment first'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get student name for receipt
    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name')
      .eq('id', student_id)
      .single()

    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student'

    console.log('Charging customer:', parent.stripe_customer_id)

    // Create a payment intent with the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses cents
      currency: 'usd',
      customer: parent.stripe_customer_id,
      payment_method_types: ['card'],
      off_session: true, // Charge without customer present
      confirm: true, // Automatically confirm
      description: `Weekly class - ${studentName} - ${attendance_date}`,
      metadata: {
        parent_id,
        enrollment_id,
        student_id,
        attendance_date,
        charge_type: 'weekly_class'
      }
    })

    console.log('Payment intent created:', paymentIntent.id)

    // Record payment in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        parent_id,
        enrollment_id,
        amount,
        event_type: 'Weekly Class',
        attendance_date,
        stripe_object_id: paymentIntent.id,
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('Failed to record payment:', paymentError)
      // Payment went through Stripe but failed to record - log for manual reconciliation
    }

    // Send confirmation email
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@3djumpstart.com'

    if (RESEND_API_KEY && parent.email) {
      try {
        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-billing-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent_id,
            student_names: [studentName],
            class_date: attendance_date,
            amount
          })
        })

        if (!emailResponse.ok) {
          console.warn('Email notification failed')
        }
      } catch (emailError) {
        console.warn('Failed to send email:', emailError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        amount_charged: amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Charge error:', error)

    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return new Response(
        JSON.stringify({
          error: 'Card declined',
          message: error.message
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error.code === 'payment_intent_authentication_failure') {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Payment method requires authentication. Parent needs to update payment method.'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Charge failed',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

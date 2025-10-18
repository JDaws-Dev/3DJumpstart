// supabase/functions/create-checkout-guest/index.ts
// Guest enrollment checkout (no auth required - for first-time customers)
// NO DATABASE RECORDS created - everything stored in Stripe metadata
// Webhook will create all records after successful payment
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-10-28.acacia',
})

// Stripe Price ID for $40 weekly class payment
const WEEKLY_PRICE_ID = 'price_1SHcmnKgkIT46sg7kgWR6PuU'

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
    // Parse request - NO AUTH REQUIRED for guest checkout
    const body = await req.json()
    const { parent_email, parent_name, parent_phone, students, success_url, cancel_url } = body

    console.log('Guest checkout request:', { parent_email, parent_name, student_count: students?.length })

    // Validate required fields
    if (!parent_email || !students || students.length === 0) {
      console.error('Validation failed:', { parent_email: !!parent_email, students: students?.length })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: parent_email, students' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate total: $40 per student
    const totalAmount = students.length * 40
    console.log('Total amount:', totalAmount)

    // Create line items for Stripe Checkout
    const line_items = students.map(() => ({
      price: WEEKLY_PRICE_ID,
      quantity: 1,
    }))
    console.log('Line items created:', line_items.length)

    // Create Stripe Checkout Session WITHOUT a customer
    // Customer will be created after successful payment by the webhook
    console.log('Creating Stripe session...')
    console.log('STRIPE_API_KEY exists:', !!Deno.env.get('STRIPE_API_KEY'))

    const sessionData = {
      mode: 'payment' as const,
      line_items,
      customer_email: parent_email,
      payment_intent_data: {
        setup_future_usage: 'off_session', // Save payment method for future charges
      },
      metadata: {
        parent_email,
        parent_name,
        parent_phone,
        students_data: JSON.stringify(students),
        payment_plan: 'weekly',
        total_amount: totalAmount.toString(),
        first_time: 'true',
      },
      success_url,
      cancel_url,
    }

    console.log('Session data prepared:', { ...sessionData, students_data: 'truncated' })

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log('Guest checkout session created:', session.id)
    console.log('Session URL:', session.url)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Create guest checkout error:', err)
    console.error('Error stack:', (err as Error).stack)
    return new Response(
      JSON.stringify({
        error: (err as Error).message,
        details: (err as Error).stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

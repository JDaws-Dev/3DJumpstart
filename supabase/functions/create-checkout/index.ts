// supabase/functions/create-checkout/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-11-20',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

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
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    const body = await req.json()
    const { parent_id, parent_email, enrollment_ids, success_url, cancel_url } = body

    console.log('Create checkout request:', { parent_id, enrollment_count: enrollment_ids.length })

    // Get enrollments from cart
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, student_id, class_period_id, class_time')
      .in('id', enrollment_ids)
      .eq('status', 'cart')

    if (enrollError || !enrollments || enrollments.length === 0) {
      console.error('No valid enrollments found:', enrollError)
      return new Response(JSON.stringify({ error: 'No valid enrollments found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Found enrollments:', enrollments.length)

    // Calculate total: $40 per student
    const totalAmount = enrollments.length * 40

    // Create line items for Stripe Checkout
    const line_items = enrollments.map(() => ({
      price: WEEKLY_PRICE_ID,
      quantity: 1,
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: parent_email,
      client_reference_id: parent_id,
      metadata: {
        parent_id,
        enrollment_ids: JSON.stringify(enrollment_ids),
        payment_plan: 'weekly',
        total_amount: totalAmount.toString()
      },
      success_url,
      cancel_url,
    })

    console.log('Checkout session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Create checkout error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

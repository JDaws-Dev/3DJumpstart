// supabase/functions/setup-payment-method/index.ts
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
    const { parent_id, success_url, cancel_url } = body

    console.log('Setup payment method request for parent:', parent_id)

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

    let customerId = parent.stripe_customer_id

    // If parent doesn't have a Stripe customer yet, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: parent.email,
        name: parent.name || undefined,
        metadata: {
          parent_id: parent_id
        }
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('parents')
        .update({ stripe_customer_id: customerId })
        .eq('id', parent_id)

      console.log('Created new Stripe customer:', customerId)
    }

    // Create a Setup Session (like Checkout but just for saving payment method)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: success_url || 'https://3djumpstart.com/portal.html?payment_method=added',
      cancel_url: cancel_url || 'https://3djumpstart.com/portal.html?payment_method=cancelled',
    })

    console.log('Setup session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Setup payment method error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// supabase/functions/create-invoice/index.ts
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

    console.log('Creating invoice for parent:', parent_id)

    // Get parent info
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

    // Get student name
    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name')
      .eq('id', student_id)
      .single()

    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student'

    // Get or create Stripe customer
    let customerId = parent.stripe_customer_id

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

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: amount * 100, // Stripe uses cents
      currency: 'usd',
      description: `Weekly Class - ${studentName} - ${new Date(attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      metadata: {
        parent_id,
        enrollment_id,
        student_id,
        attendance_date,
        charge_type: 'weekly_class'
      }
    })

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true, // Automatically finalize and send
      collection_method: 'send_invoice',
      days_until_due: 7, // Due in 7 days
      description: `3D Jumpstart - Weekly Class Payment`,
      metadata: {
        parent_id,
        enrollment_id,
        student_id,
        attendance_date
      }
    })

    // Finalize the invoice (sends it to customer)
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

    console.log('Invoice created and sent:', finalizedInvoice.id)

    // Record payment as pending in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        parent_id,
        enrollment_id,
        amount,
        event_type: 'Weekly Class',
        attendance_date,
        stripe_object_id: finalizedInvoice.id,
        status: 'pending', // Will be updated to 'succeeded' when paid via webhook
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('Failed to record payment:', paymentError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: finalizedInvoice.id,
        invoice_url: finalizedInvoice.hosted_invoice_url,
        amount_due: amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create invoice error:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to create invoice',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

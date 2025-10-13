# Stripe Payment Setup Guide

## Current System Overview

Your system is configured for **weekly payments**:
- Parents pay $40 per student for the **first week only** at enrollment
- After that, they are billed $40/week per student (you handle this via admin weekly billing)

## What Needs to Be Set Up

### 1. Create Stripe Products & Prices

You need to create a product in Stripe for the weekly class payment.

**In your Stripe Dashboard:**
1. Go to Products → Add Product
2. Name: "3D Jumpstart Weekly Class"
3. Create a Price:
   - One-time payment
   - Amount: $40 USD
4. Copy the Price ID (looks like: `price_xxxxxxxxxxxxx`)

### 2. Create the `create-checkout` Supabase Edge Function

Create a new file: `supabase/functions/create-checkout/index.ts`

```typescript
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

// Your Stripe Price ID for $40 weekly class payment
const WEEKLY_PRICE_ID = 'price_xxxxxxxxxxxxx' // REPLACE THIS with your actual Price ID

Deno.serve(async (req) => {
  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Parse request
    const body = await req.json()
    const { parent_id, parent_email, enrollment_ids, success_url, cancel_url } = body

    // Get enrollments from cart
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, student_id, class_period_id, class_time')
      .in('id', enrollment_ids)
      .eq('status', 'cart')

    if (enrollError || !enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid enrollments found' }), { status: 400 })
    }

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

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Create checkout error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    )
  }
})
```

### 3. Update the `stripe-webhook` Function

The webhook needs to handle the payment completion and update enrollments from 'cart' to 'enrolled'.

Replace your current `supabase/functions/stripe-webhook/index.ts` with:

```typescript
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

      // Record payment for each enrollment
      for (const enrollmentId of enrollmentIds) {
        await supabase.from('payments').insert({
          parent_id: parentId,
          enrollment_id: enrollmentId,
          amount: 40, // $40 per student for first week
          event_type: 'First Week',
          stripe_object_id: session.payment_intent?.toString() || session.id,
          created_at: new Date().toISOString()
        })
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
```

### 4. Deploy the Functions to Supabase

```bash
# Deploy create-checkout function
supabase functions deploy create-checkout

# Deploy updated stripe-webhook function
supabase functions deploy stripe-webhook
```

### 5. Set Environment Variables in Supabase

In your Supabase Dashboard → Edge Functions → Settings, set these secrets:

```bash
STRIPE_API_KEY=sk_live_... or sk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
SUPABASE_URL=https://hucjmggkasahwpjgnwia.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://hucjmggkasahwpjgnwia.supabase.co/functions/v1/stripe-webhook`
3. Listen to event: `checkout.session.completed`
4. Copy the signing secret and add it to your Supabase secrets

### 7. Test the Payment Flow

1. Log into your parent portal
2. Add a student to cart
3. Select a class period
4. Click "Pay for First Week"
5. Complete test payment in Stripe
6. Verify:
   - Student status changes from 'cart' to 'enrolled'
   - Payment record is created in `payments` table
   - Balance due is set to 0

## Current Payment Flow

1. **Enrollment:**
   - Parent adds student to cart (status: 'cart')
   - Parent selects class period
   - Parent clicks "Pay for First Week" ($40 per student)

2. **Stripe Checkout:**
   - `create-checkout` function creates Stripe session
   - Parent completes payment
   - Stripe sends webhook to `stripe-webhook` function

3. **Webhook Processing:**
   - Updates enrollment status: 'cart' → 'enrolled'
   - Records payment in `payments` table
   - Sets balance_due to 0

4. **Weekly Billing (Manual):**
   - Each week after class, you use the Admin Weekly Billing tab
   - Select the class that met today
   - Check which students attended
   - Click "Charge Selected Students"
   - This charges their saved payment method $40 per student

## Important Notes

- **First Week**: Paid upfront via Stripe Checkout ($40/student)
- **Subsequent Weeks**: Billed via Admin Weekly Billing ($40/student/week)
- **No long-term contracts**: Weekly payment only
- **Balance tracking**: Each enrollment has a `balance_due` field

## Troubleshooting

**Issue: Checkout button doesn't work**
- Check browser console for errors
- Verify `create-checkout` function is deployed
- Check Supabase function logs

**Issue: Payment completes but enrollment status doesn't update**
- Check Stripe webhook is configured correctly
- Verify webhook signing secret is set in Supabase
- Check Supabase function logs for `stripe-webhook`

**Issue: Weekly billing doesn't work**
- This requires saved payment methods (not implemented yet)
- You'll need to set up Stripe Customer and PaymentMethod management
- Or handle weekly billing manually through Stripe Dashboard

# Fix Payment Confirmation Issue

## Problem
Payment confirmation page gets stuck on "Processing" because the webhook wasn't setting the `stripe_object_id` field that payment-success.html needs to find the payment record.

## What Was Fixed
Updated `supabase/functions/stripe-webhook/index.ts` to include:
1. `stripe_object_id` field in payments insert (set to payment_intent or session.id)
2. `parent_id` field in payments insert (needed for enrollment lookup)

## Deploy the Fix

### Step 1: Deploy the Updated Webhook to Supabase

Run this command in your terminal:

```bash
cd /Users/jeremiahdaws/Documents/3DJumpstart
supabase functions deploy stripe-webhook
```

If you don't have Supabase CLI installed:
```bash
npm install -g supabase
supabase login
supabase link --project-ref hucjmggkasahwpjgnwia
supabase functions deploy stripe-webhook
```

### Step 2: Verify Environment Variables

Make sure these are set in Supabase Dashboard → Edge Functions → Settings:

- `STRIPE_API_KEY` (your Stripe secret key)
- `STRIPE_WEBHOOK_SIGNING_SECRET` (from Stripe dashboard)
- `SUPABASE_URL` (https://hucjmggkasahwpjgnwia.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` (from Supabase settings)
- `RESEND_API_KEY` (for sending emails)
- `FROM_EMAIL` (your verified sender email)

### Step 3: Test a Payment

1. Go to your site and enroll a student
2. Complete checkout with Stripe test card: `4242 4242 4242 4242`
3. Verify you're redirected to payment-success.html
4. Confirm it shows "Complete" instead of "Processing"
5. Go back to parent portal and verify student is enrolled

### Step 4: Check Logs (if issues persist)

**Stripe Dashboard:**
- Go to Developers → Webhooks
- Click on your webhook endpoint
- Check recent deliveries for errors

**Supabase Dashboard:**
- Go to Edge Functions → stripe-webhook
- Click "Logs" tab
- Look for any error messages

## What This Fixes

Before:
- Webhook created payment record WITHOUT `stripe_object_id`
- payment-success.html looked for payment by `stripe_object_id`
- Could never find the payment → stuck on "Processing"

After:
- Webhook creates payment WITH `stripe_object_id` set to session ID
- payment-success.html can find the payment immediately
- Shows "Complete" and enrollment details

# Stripe Payment Deployment Checklist

## ✅ What We've Created

1. **Stripe Product & Price:**
   - Product ID: `prod_TE4wJtQ99zDho2`
   - Price ID: `price_1SHcmnKgkIT46sg7kgWR6PuU`
   - Amount: $40 USD (one-time payment)

2. **Supabase Edge Functions:**
   - ✅ `create-checkout/index.ts` - Creates Stripe checkout sessions
   - ✅ `stripe-webhook/index.ts` - Handles payment completion

## 📋 Deployment Steps

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
cd /Users/jeremiahdaws/Documents/3DJumpstart
supabase link --project-ref hucjmggkasahwpjgnwia
```

### Step 4: Set Environment Secrets

You need to set these secrets in Supabase. You can do this either via CLI or Dashboard.

**Via CLI:**
```bash
# Get your Stripe API key from: https://dashboard.stripe.com/apikeys
supabase secrets set STRIPE_API_KEY=sk_test_... # or sk_live_...

# Your Supabase URL (already set, but verify)
supabase secrets set SUPABASE_URL=https://hucjmggkasahwpjgnwia.supabase.co

# Get service role key from Supabase Dashboard → Settings → API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Webhook signing secret (we'll get this after creating the webhook)
# For now, set a placeholder:
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=placeholder
```

**Via Dashboard (Alternative):**
1. Go to: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/settings/functions
2. Click "Edge Functions" → "Manage secrets"
3. Add each secret

### Step 5: Deploy the Functions

```bash
cd /Users/jeremiahdaws/Documents/3DJumpstart

# Deploy create-checkout function
supabase functions deploy create-checkout

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

### Step 6: Configure Stripe Webhook

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Set Endpoint URL:
   ```
   https://hucjmggkasahwpjgnwia.supabase.co/functions/v1/stripe-webhook
   ```
4. Under "Events to send", select:
   - ✅ `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Update the secret in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
   ```

### Step 7: Test the Payment Flow

#### Test Mode (Recommended First)
1. Make sure you're using Stripe **test mode** keys
2. Log into your parent portal: https://3djumpstart.com/portal.html
3. Add a test student to cart
4. Select a class period
5. Click "Pay for First Week"
6. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
7. Complete payment
8. Verify:
   - You're redirected to payment-success.html
   - Student status changes to "enrolled" (refresh portal)
   - Payment appears in admin panel

#### Check Logs
```bash
# View create-checkout logs
supabase functions logs create-checkout

# View stripe-webhook logs
supabase functions logs stripe-webhook
```

### Step 8: Switch to Live Mode (When Ready)

1. In Stripe Dashboard, switch to **Live mode**
2. Get your **live** API keys from: https://dashboard.stripe.com/apikeys
3. Update the Supabase secret:
   ```bash
   supabase secrets set STRIPE_API_KEY=sk_live_...
   ```
4. Create a **new webhook** for live mode with the same settings
5. Update the webhook signing secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_live_...
   ```

## 🔍 Troubleshooting

### Issue: "No authorization" error
- Make sure you're logged in to the parent portal
- Check browser console for auth token errors
- Try logging out and back in

### Issue: "No valid enrollments found"
- Verify students are in "cart" status
- Check that class periods are selected
- Look at browser console for API errors

### Issue: Payment completes but status doesn't update
- Check Stripe webhook logs in Stripe Dashboard
- Verify webhook signing secret is correct
- Check Supabase function logs: `supabase functions logs stripe-webhook`

### Issue: Checkout session creation fails
- Verify STRIPE_API_KEY is set correctly
- Check that Price ID `price_1SHcmnKgkIT46sg7kgWR6PuU` exists
- Check function logs: `supabase functions logs create-checkout`

## 📊 What Happens After Payment

1. **Immediately:**
   - Enrollment status: `cart` → `enrolled`
   - Balance due: Set to $0
   - Payment record created in `payments` table

2. **Weekly Billing (After First Week):**
   - You use the Admin Weekly Billing tab
   - Select the class that met today
   - Check students who attended
   - Click "Charge Selected Students"
   - System charges $40 per student

## 🎯 Payment Flow Summary

```
Parent adds student to cart (status: 'cart')
           ↓
Parent clicks "Pay for First Week" ($40)
           ↓
create-checkout creates Stripe session
           ↓
Parent completes payment in Stripe
           ↓
Stripe webhook fires → stripe-webhook function
           ↓
Enrollment updated: 'cart' → 'enrolled'
Payment recorded in database
           ↓
Parent sees "Enrolled ✓" in portal
```

## 📞 Need Help?

- Stripe Dashboard: https://dashboard.stripe.com
- Supabase Dashboard: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia
- Stripe Docs: https://stripe.com/docs/checkout/quickstart
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

# Payment Method Setup - Deployment Guide

## Summary
Implemented Option 3 (Hybrid Approach) for payment method saving:
1. During enrollment checkout, attempt to save payment method with `setup_future_usage: 'off_session'`
2. After checkout, webhook checks if payment method was actually saved
3. If payment method wasn't saved, send email notification to parent
4. Parent portal shows warning and "Add Payment Method" button
5. Parent can click button to go through Stripe Setup Mode to save a card
6. Weekly billing function updated to reliably retrieve saved payment methods

## Files Changed

### 1. Supabase Edge Functions (Need Deployment)

#### `supabase/functions/stripe-webhook/index.ts`
**Changes:**
- Added payment method checking after checkout
- Sends notification email if payment method not saved
- New function: `sendPaymentMethodNeededEmail()`

**Deploy with:**
```bash
npx supabase functions deploy stripe-webhook
```

#### `supabase/functions/charge-weekly-class/index.ts`
**Changes:**
- Updated payment method retrieval to check `invoice_settings.default_payment_method`
- Falls back to listing all payment methods if no default
- Uses first available card payment method
- Better logging for debugging

**Deploy with:**
```bash
npx supabase functions deploy charge-weekly-class
```

#### `supabase/functions/setup-payment-method/index.ts` ⭐ NEW
**Purpose:**
- Creates Stripe Checkout Session in `mode: 'setup'`
- Allows parents to save payment method without charging
- Creates Stripe customer if needed

**Deploy with:**
```bash
npx supabase functions deploy setup-payment-method
```

### 2. Frontend Files

#### `portal.html`
**Changes:**
- Added payment method status indicator cards
- Shows warning if no payment method saved
- Shows success message if payment method exists
- "Add Payment Method" button
- New function: `checkPaymentMethodStatus()`
- New function: `setupPaymentMethod()`
- URL parameter handling for successful payment method addition

**Already deployed** (static HTML file, no deployment needed)

## Deployment Steps

### Step 1: Deploy Supabase Functions

You'll need your Supabase access token. Run these commands:

```bash
# Deploy stripe-webhook (updated)
npx supabase functions deploy stripe-webhook --project-ref YOUR_PROJECT_REF

# Deploy charge-weekly-class (updated)
npx supabase functions deploy charge-weekly-class --project-ref YOUR_PROJECT_REF

# Deploy setup-payment-method (new)
npx supabase functions deploy setup-payment-method --project-ref YOUR_PROJECT_REF
```

Or deploy all at once:
```bash
npx supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### Step 2: Commit and Push Frontend Changes

The portal.html changes are already saved. Just need to commit:

```bash
git add portal.html
git add supabase/functions/stripe-webhook/index.ts
git add supabase/functions/charge-weekly-class/index.ts
git add supabase/functions/setup-payment-method/index.ts
git commit -m "Add payment method detection and setup functionality"
git push
```

### Step 3: Deploy to Netlify

If using Netlify, the portal.html changes will be automatically deployed when you push to your repository.

## Testing the Complete Flow

### Test 1: New Enrollment with Payment Method Saving
1. Create a new test parent account
2. Add a student and enroll
3. Go through checkout with a test card
4. Check Stripe Dashboard: Customer should have saved payment method
5. Check parent's email: Should receive enrollment confirmation
6. Check portal: Should show "✅ Payment Method Saved" message

### Test 2: New Enrollment WITHOUT Payment Method (edge case)
1. Create new parent account
2. Enroll with test card that doesn't support off-session
3. Check parent's email: Should receive TWO emails
   - Enrollment confirmation
   - Warning about payment method needed
4. Check portal: Should show "⚠️ Payment Method Required" warning
5. Click "Add Payment Method" button
6. Complete Stripe Setup Mode checkout
7. Return to portal: Should show "✅ Payment Method Saved"

### Test 3: Weekly Billing with Saved Payment Method
1. Use an account with saved payment method
2. Go to admin panel
3. Mark attendance for a student
4. Click "Bill Selected Students"
5. Should charge successfully
6. Check Stripe Dashboard: Payment should appear
7. Check database: Payment record should be created
8. Parent should receive billing confirmation email

### Test 4: Existing Customers with Payment Methods
1. Test with customers that already have payment methods (cards ending in 0892, 1041)
2. Charge function should find and use their existing payment methods
3. Should work without any changes needed from parent

## How It Works

### Flow for NEW enrollments:

```
Parent enrolls → Stripe Checkout (payment mode) → Payment succeeds
                 ↓
            setup_future_usage: 'off_session' attempts to save card
                 ↓
            Webhook receives checkout.session.completed
                 ↓
            Check if payment method was saved
                 ↓
        ┌───────┴─────────┐
        ↓                 ↓
   SAVED                NOT SAVED
   Send confirmation    Send confirmation + warning email
   Portal shows ✅      Portal shows ⚠️ + "Add Payment Method"
```

### Flow for ADDING payment method later:

```
Parent clicks "Add Payment Method" → setup-payment-method function
                 ↓
        Creates Stripe Checkout (setup mode)
                 ↓
        Parent enters card details
                 ↓
        Stripe saves payment method to customer
                 ↓
        Redirects back to portal with success parameter
                 ↓
        Portal shows ✅ and refreshes status
```

### Flow for WEEKLY billing:

```
Admin marks attendance → Clicks "Bill Selected Students"
                 ↓
        charge-weekly-class function called
                 ↓
        Retrieves parent's Stripe customer ID
                 ↓
        Checks for default payment method
                 ↓
        ┌───────┴─────────┐
        ↓                 ↓
   HAS DEFAULT        NO DEFAULT
   Use it             List all payment methods → Use first card
                 ↓
        Creates PaymentIntent with off_session: true
                 ↓
        Charges card automatically
                 ↓
        Records payment in database
                 ↓
        Sends confirmation email to parent
```

## Email Templates

### 1. Enrollment Confirmation (existing)
- Sent after successful payment
- Includes enrolled students
- Shows what to bring
- Links to parent portal

### 2. Payment Method Needed Warning (NEW)
- Sent after checkout if payment method not saved
- Subject: "⚠️ Action Required: Add Payment Method for Weekly Billing"
- Explains what happened
- "Add Payment Method" button link to portal
- Only sent if parent has enrolled students

### 3. Weekly Billing Confirmation (existing)
- Sent after weekly charge
- Shows student name, date, amount
- Receipt for parent's records

## Troubleshooting

### Payment methods not being saved during checkout
- Check Stripe logs for the checkout session
- Verify `setup_future_usage: 'off_session'` is in create-checkout
- Some cards don't support off-session (require 3D Secure every time)
- Parent can use "Add Payment Method" button as fallback

### Weekly billing fails with "No payment method found"
- Check parent has stripe_customer_id in database
- Check customer has payment methods in Stripe Dashboard
- Check charge-weekly-class function logs for details
- Verify payment method is type 'card'

### Email not sending
- Check RESEND_API_KEY is set in Supabase environment
- Check FROM_EMAIL is configured
- Check Supabase function logs for email errors
- Verify parent has valid email address

### "Add Payment Method" button not appearing
- Check parent has enrolled students (it only shows for enrolled)
- Check parent doesn't already have stripe_customer_id
- Check browser console for JavaScript errors

## Why This Approach Works

1. **Non-intrusive**: Parents still pay immediately during enrollment (good UX)
2. **Automatic detection**: System automatically detects if payment method wasn't saved
3. **Clear communication**: Parent gets email if action needed
4. **Easy fix**: "Add Payment Method" button makes it one-click to fix
5. **Universal support**: Works with ALL card types, even those that don't support off-session initially
6. **No data loss**: Weekly billing still works for customers who already have saved methods
7. **Admin-friendly**: Admin doesn't need to manually check which parents have payment methods

## Next Steps

After deployment and testing:
1. Monitor Stripe Dashboard to see what % of new enrollments save payment methods automatically
2. Monitor how many parents need to use "Add Payment Method" button
3. Consider adding payment method management (view/update/delete) in portal
4. Consider sending reminder emails before weekly billing occurs
5. Consider adding payment history view in parent portal

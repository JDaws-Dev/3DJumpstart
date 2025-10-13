# Urgent Fixes Needed

You have 2 critical issues that need to be fixed in your Supabase Dashboard:

## Issue 1: Students Table RLS Policy ⚠️

**Problem:** Parents can't add students - getting "violates row-level security policy"

**Fix:** Run the SQL in `FIX_STUDENTS_RLS.sql`

**Steps:**
1. Go to https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/editor
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy all the SQL from `FIX_STUDENTS_RLS.sql` and paste it
5. Click "Run" (or press Cmd+Enter)

This will allow parents to create/view/edit their own students.

---

## Issue 2: Webhook Missing Payment Fields ⚠️

**Problem:** Payments stuck on "Processing" - webhook not setting `stripe_object_id`

**Fix:** Update the webhook code in Supabase Dashboard

**Steps:**
1. Go to https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/functions
2. Find and click on `stripe-webhook`
3. You should see the code editor
4. **Replace lines 60-68** (the payments insert section) with this:

```typescript
      // Payments
      await supabase.from('payments').insert({
        order_id: order.id,
        parent_id: parentId,
        amount: paidAmount,
        payment_type: 'stripe',
        stripe_charge_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripe_object_id: (typeof session.payment_intent === 'string' ? session.payment_intent : null) || session.id,
        status: 'succeeded',
        processed_at: new Date().toISOString()
      })
```

**Key changes:**
- Added `parent_id: parentId,` on line 63
- Added `stripe_object_id: (typeof session.payment_intent === 'string' ? session.payment_intent : null) || session.id,` on line 67

5. Click "Deploy" or "Save"

---

## After Fixing Both Issues

Test the complete flow:
1. Login as a parent
2. Add a student (should work now)
3. Enroll them in a class
4. Complete payment with test card: `4242 4242 4242 4242`
5. Confirmation page should show "Complete" (not "Processing")
6. Student should appear as enrolled in portal

---

## Why These Issues Happened

**Students RLS:** The database has Row Level Security enabled, but the policy allowing parents to insert students was missing or incorrect.

**Webhook:** The code was updated to add email confirmations (commit c09681f), but accidentally removed the `stripe_object_id` and `parent_id` fields that payment-success.html needs to find the payment.

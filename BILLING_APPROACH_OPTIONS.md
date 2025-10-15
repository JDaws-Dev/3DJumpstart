# Weekly Billing Implementation Options

## Current Issue
The `setup_future_usage: 'off_session'` parameter doesn't reliably save payment methods for all card types. This makes automatic weekly billing unreliable.

---

## Option 1: Use Stripe Subscriptions (RECOMMENDED)

**How it works:**
- Parent enrolls → Creates a $40/week Stripe subscription
- Stripe automatically charges every week
- No manual admin intervention needed
- Built-in retry logic for failed payments
- Payment method automatically saved

**Pros:**
- ✅ Most reliable - Stripe handles everything
- ✅ Automatic billing - no admin work needed
- ✅ Payment methods always saved
- ✅ Failed payment retries built-in
- ✅ Can pause/cancel per student

**Cons:**
- ❌ Charges automatically (even if student doesn't attend)
- ❌ Less flexible than attendance-based billing

**Best for:** Regular weekly classes where attendance is consistent

---

## Option 2: Setup Intent + Manual Charging (CURRENT ATTEMPT)

**How it works:**
- Parent enrolls → Pays $40 + saves payment method
- Admin marks attendance weekly
- Admin charges saved payment methods

**Pros:**
- ✅ Only charges for classes attended
- ✅ Flexible - admin controls when to charge

**Cons:**
- ❌ Complex implementation
- ❌ Payment method saving is unreliable
- ❌ Requires admin to remember to bill
- ❌ No automatic retry for failed payments

**Status:** Having reliability issues with payment method saving

---

## Option 3: Invoice-Based Billing

**How it works:**
- Admin marks attendance
- System generates Stripe invoice
- Parent receives invoice email
- Parent pays invoice manually

**Pros:**
- ✅ Simple implementation
- ✅ Only bills for attendance
- ✅ Clear paper trail
- ✅ Works with saved payment methods OR manual payment

**Cons:**
- ❌ Requires parent action to pay
- ❌ May have delayed payments
- ❌ More parent friction

---

## Option 4: Hybrid: Subscription with Attendance Adjustment

**How it works:**
- Create $40/week subscription
- If student misses class → issue credit
- Or: Pause subscription for missed weeks

**Pros:**
- ✅ Reliable automatic billing
- ✅ Can refund/credit missed classes
- ✅ Payment methods always saved

**Cons:**
- ❌ More complex credit logic
- ❌ Parent charged first, refunded later

---

## My Recommendation: Option 1 (Subscriptions)

**Why:**
1. Most reliable and proven
2. Zero admin overhead
3. Stripe handles everything
4. Industry standard for recurring payments

**How to implement:**
1. Change from one-time payment to subscription
2. Create a $40/week Stripe subscription product
3. When parent enrolls → subscribe them
4. When student drops out → cancel subscription
5. Optional: Add pause feature for breaks

**Trade-off:**
- You lose attendance-based billing
- But gain reliability and simplicity
- Most class businesses charge regardless of attendance (like gym memberships)

---

## Alternative Recommendation: Option 3 (Invoices)

**If you want attendance-based billing:**
1. Admin marks attendance
2. System creates Stripe invoice
3. Stripe sends invoice to parent
4. Parent pays (can save payment method for auto-pay)
5. Much simpler than trying to charge manually

---

## What do you want to do?

**Question 1:** Is it acceptable to charge weekly regardless of attendance?
- **YES** → Go with Subscriptions (Option 1)
- **NO** → Go with Invoices (Option 3)

**Question 2:** Do you want automated billing or admin-controlled billing?
- **AUTOMATED** → Subscriptions (Option 1)
- **ADMIN-CONTROLLED** → Invoices (Option 3)

Let me know which approach you prefer and I'll implement it properly.

-- Clear invalid Stripe customer ID that no longer exists in Stripe
-- Customer ID: cus_TERXxp8QrZClou was deleted but still in database

UPDATE parents
SET stripe_customer_id = NULL
WHERE stripe_customer_id = 'cus_TERXxp8QrZClou';

-- Verify it was cleared
SELECT id, email, stripe_customer_id, name
FROM parents
WHERE email = 'jdaws@artiosacademies.com';

-- Expected result: stripe_customer_id should be NULL

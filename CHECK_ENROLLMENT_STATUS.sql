-- Check Barry Charles enrollment status
SELECT
    s.first_name,
    s.last_name,
    e.status,
    e.class_time,
    e.balance_due,
    e.created_at,
    e.updated_at
FROM students s
JOIN enrollments e ON e.student_id = s.id
WHERE s.first_name = 'Barry' AND s.last_name = 'Charles'
ORDER BY e.updated_at DESC;

-- Check if payment was recorded
SELECT
    p.amount,
    p.event_type,
    p.stripe_object_id,
    p.created_at,
    s.first_name,
    s.last_name
FROM payments p
JOIN enrollments e ON e.id = p.enrollment_id
JOIN students s ON s.id = e.student_id
WHERE s.first_name = 'Barry' AND s.last_name = 'Charles'
ORDER BY p.created_at DESC;

-- Check parent's new customer ID
SELECT
    email,
    stripe_customer_id,
    name
FROM parents
WHERE email = 'jdaws@artiosacademies.com';

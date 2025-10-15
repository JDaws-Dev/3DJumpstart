-- Find Barry's enrollment
SELECT
    e.id as enrollment_id,
    e.status,
    e.student_id,
    s.first_name,
    s.last_name,
    e.class_time
FROM enrollments e
JOIN students s ON s.id = e.student_id
WHERE s.first_name = 'Barry' AND s.last_name = 'Charles';

-- If the status is 'cart', update it to 'enrolled'
-- Replace the enrollment_id below with the actual ID from the query above
-- UPDATE enrollments
-- SET status = 'enrolled', balance_due = 0
-- WHERE id = 'REPLACE_WITH_ENROLLMENT_ID';

-- Check enrollment counts per class period
-- Run this to see how many students are enrolled in each time slot

SELECT
    class_time,
    COUNT(*) as enrolled_students,
    CASE
        WHEN COUNT(*) >= 10 THEN 'FULL'
        WHEN COUNT(*) >= 5 THEN 'READY TO START'
        ELSE 'NEEDS MORE STUDENTS'
    END as status,
    10 - COUNT(*) as spots_remaining
FROM enrollments
WHERE status = 'enrolled'
GROUP BY class_time
ORDER BY class_time;

-- Show total enrollments across all classes
SELECT
    'TOTAL' as class_time,
    COUNT(*) as enrolled_students,
    40 - COUNT(*) as total_spots_remaining
FROM enrollments
WHERE status = 'enrolled';

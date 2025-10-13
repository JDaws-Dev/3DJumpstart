-- DATABASE CLEANUP - Remove Old Tuesday Classes and Reset
-- Run this in Supabase SQL Editor to start fresh

-- Step 1: Delete all old enrollments (this will cascade delete related payments)
DELETE FROM public.enrollments;

-- Step 2: Delete all old students
DELETE FROM public.students;

-- Step 3: Delete all old parents (optional - keeps login accounts but removes data)
-- Uncomment the line below if you want to delete parent records too:
-- DELETE FROM public.parents;

-- Step 4: Delete old advanced class requests
DELETE FROM public.advanced_class_requests;

-- Verify cleanup
SELECT 'Enrollments remaining:' as check_name, COUNT(*) as count FROM public.enrollments
UNION ALL
SELECT 'Students remaining:' as check_name, COUNT(*) as count FROM public.students
UNION ALL
SELECT 'Parents remaining:' as check_name, COUNT(*) as count FROM public.parents
UNION ALL
SELECT 'Payments remaining:' as check_name, COUNT(*) as count FROM public.payments
UNION ALL
SELECT 'Advanced requests remaining:' as check_name, COUNT(*) as count FROM public.advanced_class_requests;

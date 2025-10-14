-- RESET ALL DATA - Use with caution!
-- This will delete all test data from the database
-- Run these statements one at a time in Supabase SQL Editor

-- 1. Delete attendance records first (references enrollments)
DELETE FROM public.attendance;

-- 2. Delete payments (references enrollments and parents)
DELETE FROM public.payments;

-- 3. Delete blackout dates (no dependencies)
DELETE FROM public.blackout_dates;

-- 4. Delete enrollments (references students)
DELETE FROM public.enrollments;

-- 5. Delete students (references parents)
DELETE FROM public.students;

-- 6. Delete parents (this deletes login accounts!)
-- WARNING: This will remove all parent user accounts
-- Only uncomment if you want to completely reset
DELETE FROM public.parents;

-- 7. Reset auth users (removes login credentials)
-- WARNING: This deletes authentication data - users will need to re-register
-- Only uncomment if you want to delete all user accounts
-- DELETE FROM auth.users;

-- Verify everything is cleared
SELECT 'Attendance' as table_name, COUNT(*) as count FROM public.attendance
UNION ALL
SELECT 'Payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'Blackout Dates', COUNT(*) FROM public.blackout_dates
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM public.enrollments
UNION ALL
SELECT 'Students', COUNT(*) FROM public.students
UNION ALL
SELECT 'Parents', COUNT(*) FROM public.parents
UNION ALL
SELECT 'Auth Users', COUNT(*) FROM auth.users;

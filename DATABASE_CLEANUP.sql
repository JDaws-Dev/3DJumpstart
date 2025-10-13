-- Database Cleanup Script
-- ONLY run this if you need to start fresh with attendance/blackout tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql

-- WARNING: This will delete all attendance and blackout data!
-- Only use if you're having issues or want to reset

-- ========================================
-- ATTENDANCE TABLE CLEANUP
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON attendance;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_attendance_timestamp ON attendance;
DROP FUNCTION IF EXISTS update_attendance_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_attendance_date;
DROP INDEX IF EXISTS idx_attendance_student;
DROP INDEX IF EXISTS idx_attendance_enrollment;
DROP INDEX IF EXISTS idx_attendance_class;

-- Drop table (this deletes all attendance records)
-- DROP TABLE IF EXISTS attendance CASCADE;

-- ========================================
-- BLACKOUT DATES TABLE CLEANUP
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON blackout_dates;

-- Drop index
DROP INDEX IF EXISTS idx_blackout_dates_date;

-- Drop table (this deletes all blackout dates)
-- DROP TABLE IF EXISTS blackout_dates CASCADE;

-- ========================================
-- After running cleanup, run the setup scripts again:
-- 1. ATTENDANCE_SETUP.sql
-- 2. BLACKOUT_DATES_SETUP.sql
-- ========================================

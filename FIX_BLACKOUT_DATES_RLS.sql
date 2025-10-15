-- Fix RLS policies for blackout_dates table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql

-- 1. Drop existing policies (in case they exist with wrong settings)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON blackout_dates;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON blackout_dates;

-- 2. Recreate policies with correct permissions
-- Allow all authenticated users to read blackout dates
CREATE POLICY "Enable read access for all authenticated users" ON blackout_dates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert blackout dates
CREATE POLICY "Enable insert access for authenticated users" ON blackout_dates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update blackout dates
CREATE POLICY "Enable update access for authenticated users" ON blackout_dates
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete blackout dates
CREATE POLICY "Enable delete access for authenticated users" ON blackout_dates
  FOR DELETE USING (auth.role() = 'authenticated');

-- Done! Try adding a blackout date again.

-- Fix RLS policies for attendance table
-- Allow authenticated users (admin/parents) to manage attendance

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON attendance;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON attendance;

-- Allow authenticated users to insert attendance records
CREATE POLICY "Enable insert for authenticated users"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read attendance records
CREATE POLICY "Enable read access for authenticated users"
ON attendance
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update attendance records
CREATE POLICY "Enable update for authenticated users"
ON attendance
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete attendance records
CREATE POLICY "Enable delete for authenticated users"
ON attendance
FOR DELETE
TO authenticated
USING (true);

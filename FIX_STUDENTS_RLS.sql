-- Fix RLS policy for students table
-- This allows parents to create students for themselves

-- Drop existing insert policy if it exists (in case we need to recreate)
DROP POLICY IF EXISTS "Parents can insert their own students" ON students;

-- Create policy allowing parents to insert students with their own parent_id
CREATE POLICY "Parents can insert their own students"
ON students
FOR INSERT
TO authenticated
WITH CHECK (parent_id = auth.uid());

-- Also make sure parents can read and update their own students
DROP POLICY IF EXISTS "Parents can view their own students" ON students;
CREATE POLICY "Parents can view their own students"
ON students
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can update their own students" ON students;
CREATE POLICY "Parents can update their own students"
ON students
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

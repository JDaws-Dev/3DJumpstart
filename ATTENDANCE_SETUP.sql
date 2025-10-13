-- Attendance Tracking System Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql

-- 1. Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_period_id TEXT NOT NULL,
  class_date DATE NOT NULL,
  present BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Prevent duplicate attendance records for same student on same date
  UNIQUE(enrollment_id, class_date)
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(class_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_period_id);

-- 3. Add attendance tracking to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS attendance_ids UUID[];

-- 4. Enable Row Level Security (RLS)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (allow authenticated users to read/write)
CREATE POLICY "Enable read access for authenticated users" ON attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON attendance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON attendance
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON attendance
  FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_attendance_timestamp ON attendance;
CREATE TRIGGER update_attendance_timestamp
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- Done! You can now track attendance in your admin panel.

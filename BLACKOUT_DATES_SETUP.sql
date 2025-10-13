-- Blackout Dates System Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hucjmggkasahwpjgnwia/sql

-- 1. Create blackout_dates table
CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blackout_dates_date ON blackout_dates(date);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Anyone can read blackout dates (parents need to see them)
CREATE POLICY "Enable read access for all authenticated users" ON blackout_dates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can insert/update/delete
CREATE POLICY "Enable insert access for authenticated users" ON blackout_dates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON blackout_dates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON blackout_dates
  FOR DELETE USING (auth.role() = 'authenticated');

-- Done! You can now manage blackout dates in your admin panel.

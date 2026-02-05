-- ============================================
-- Supabase Row Level Security (RLS) Setup
-- ============================================
-- Run this in your Supabase SQL Editor to secure your database
-- https://supabase.com/dashboard/project/aadkzcmqgufyzcghexly/sql

-- Enable RLS on the portfolios table
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own portfolio" ON portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolio" ON portfolios;
DROP POLICY IF EXISTS "Users can update own portfolio" ON portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolio" ON portfolios;

-- Policy: Users can only read their own portfolio items
CREATE POLICY "Users can read own portfolio"
  ON portfolios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert portfolio items for themselves
CREATE POLICY "Users can insert own portfolio"
  ON portfolios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own portfolio items
CREATE POLICY "Users can update own portfolio"
  ON portfolios
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own portfolio items
CREATE POLICY "Users can delete own portfolio"
  ON portfolios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'portfolios';

-- View all policies on the portfolios table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'portfolios';

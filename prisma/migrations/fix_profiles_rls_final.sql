-- ============================================
-- FIX PROFILES_PF RLS POLICIES
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================

-- First, drop all existing policies on profiles_pf to start fresh
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles_pf;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles_pf;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles_pf;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles_pf;

-- Ensure RLS is enabled
ALTER TABLE profiles_pf ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can SELECT their own profile
CREATE POLICY "Users can view own profile"
ON profiles_pf FOR SELECT
TO authenticated
USING (id = auth.uid()::text);

-- Policy 2: Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON profiles_pf FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Policy 3: Users can INSERT their own profile (needed for registration)
CREATE POLICY "Users can insert own profile"
ON profiles_pf FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid()::text);

-- ============================================
-- VERIFY: Check current policies
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles_pf';

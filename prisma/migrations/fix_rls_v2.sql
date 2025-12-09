-- Fix RLS policies with correct UUID to text casting

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles_pf;

DROP POLICY IF EXISTS "Users can view own company profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can insert own company profile" ON profiles_pj;
DROP POLICY IF EXISTS "Users can update own company profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can delete own company profiles" ON profiles_pj;

-- ============================================
-- PROFILES_PF POLICIES - Using CAST for safety
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles_pf FOR SELECT
TO authenticated
USING (id = CAST(auth.uid() AS TEXT));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles_pf FOR UPDATE
TO authenticated
USING (id = CAST(auth.uid() AS TEXT));

-- Users can insert their own profile (for signup trigger)
CREATE POLICY "Users can insert own profile"
ON profiles_pf FOR INSERT
TO authenticated
WITH CHECK (id = CAST(auth.uid() AS TEXT));

-- ============================================
-- PROFILES_PJ POLICIES - Using CAST for safety
-- ============================================

-- Users can view their own company profiles
CREATE POLICY "Users can view own company profiles"
ON profiles_pj FOR SELECT
TO authenticated
USING (pf_id = CAST(auth.uid() AS TEXT));

-- Users can insert their own company profiles
CREATE POLICY "Users can insert own company profile"
ON profiles_pj FOR INSERT
TO authenticated
WITH CHECK (pf_id = CAST(auth.uid() AS TEXT));

-- Users can update their own company profiles
CREATE POLICY "Users can update own company profiles"
ON profiles_pj FOR UPDATE
TO authenticated
USING (pf_id = CAST(auth.uid() AS TEXT));

-- Users can delete their own company profiles
CREATE POLICY "Users can delete own company profiles"
ON profiles_pj FOR DELETE
TO authenticated
USING (pf_id = CAST(auth.uid() AS TEXT));

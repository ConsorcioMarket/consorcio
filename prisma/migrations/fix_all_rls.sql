-- Complete RLS fix - remove all problematic policies and recreate clean ones

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- profiles_pf
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles_pf;

-- profiles_pj
DROP POLICY IF EXISTS "Users can insert own company profile" ON profiles_pj;
DROP POLICY IF EXISTS "Users can view own company profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can update own company profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can delete own company profiles" ON profiles_pj;

-- cotas
DROP POLICY IF EXISTS "Anyone can view available cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can view own cotas" ON cotas;
DROP POLICY IF EXISTS "Users can insert own cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can update own available cotas" ON cotas;
DROP POLICY IF EXISTS "Public can view available cotas" ON cotas;

-- proposals
DROP POLICY IF EXISTS "Buyers can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Sellers can view proposals on their cotas" ON proposals;
DROP POLICY IF EXISTS "Users can insert proposals" ON proposals;

-- documents
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;

-- history tables
DROP POLICY IF EXISTS "Buyers can view own proposal history" ON proposal_history;
DROP POLICY IF EXISTS "Sellers can view own cota history" ON cota_history;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles_pf ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_pj ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cota_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES_PF POLICIES (NO ADMIN RECURSION)
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles_pf FOR SELECT
TO authenticated
USING (id = auth.uid()::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles_pf FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Users can insert their own profile (for signup trigger)
CREATE POLICY "Users can insert own profile"
ON profiles_pf FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid()::text);

-- ============================================
-- PROFILES_PJ POLICIES
-- ============================================

-- Users can view their own company profiles
CREATE POLICY "Users can view own company profiles"
ON profiles_pj FOR SELECT
TO authenticated
USING (pf_id = auth.uid()::text);

-- Users can insert their own company profiles
CREATE POLICY "Users can insert own company profile"
ON profiles_pj FOR INSERT
TO authenticated
WITH CHECK (pf_id = auth.uid()::text);

-- Users can update their own company profiles
CREATE POLICY "Users can update own company profiles"
ON profiles_pj FOR UPDATE
TO authenticated
USING (pf_id = auth.uid()::text)
WITH CHECK (pf_id = auth.uid()::text);

-- Users can delete their own company profiles
CREATE POLICY "Users can delete own company profiles"
ON profiles_pj FOR DELETE
TO authenticated
USING (pf_id = auth.uid()::text);

-- ============================================
-- COTAS POLICIES
-- ============================================

-- Anyone authenticated can view available cotas
CREATE POLICY "Anyone can view available cotas"
ON cotas FOR SELECT
TO authenticated
USING (status = 'AVAILABLE');

-- Sellers can view their own cotas (any status)
CREATE POLICY "Sellers can view own cotas"
ON cotas FOR SELECT
TO authenticated
USING (seller_id = auth.uid()::text);

-- Users can insert their own cotas
CREATE POLICY "Users can insert own cotas"
ON cotas FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid()::text);

-- Sellers can update their own cotas
CREATE POLICY "Sellers can update own available cotas"
ON cotas FOR UPDATE
TO authenticated
USING (seller_id = auth.uid()::text)
WITH CHECK (seller_id = auth.uid()::text);

-- Anonymous users can view available cotas (for homepage)
CREATE POLICY "Public can view available cotas"
ON cotas FOR SELECT
TO anon
USING (status = 'AVAILABLE');

-- ============================================
-- PROPOSALS POLICIES
-- ============================================

-- Buyers can view their own proposals
CREATE POLICY "Buyers can view own proposals"
ON proposals FOR SELECT
TO authenticated
USING (buyer_pf_id = auth.uid()::text);

-- Users can insert proposals
CREATE POLICY "Users can insert proposals"
ON proposals FOR INSERT
TO authenticated
WITH CHECK (buyer_pf_id = auth.uid()::text);

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
TO authenticated
USING (owner_id = auth.uid()::text);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid()::text);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
TO authenticated
USING (owner_id = auth.uid()::text)
WITH CHECK (owner_id = auth.uid()::text);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
TO authenticated
USING (owner_id = auth.uid()::text);

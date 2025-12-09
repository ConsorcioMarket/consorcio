-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles_pf;

DROP POLICY IF EXISTS "Users can insert own company profile" ON profiles_pj;
DROP POLICY IF EXISTS "Users can view own company profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can update own company profiles" ON profiles_pj;

DROP POLICY IF EXISTS "Anyone can view available cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can view own cotas" ON cotas;
DROP POLICY IF EXISTS "Users can insert own cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can update own available cotas" ON cotas;
DROP POLICY IF EXISTS "Public can view available cotas" ON cotas;

DROP POLICY IF EXISTS "Buyers can view own proposals" ON proposals;
DROP POLICY IF EXISTS "Sellers can view proposals on their cotas" ON proposals;
DROP POLICY IF EXISTS "Users can insert proposals" ON proposals;

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;

DROP POLICY IF EXISTS "Buyers can view own proposal history" ON proposal_history;
DROP POLICY IF EXISTS "Sellers can view own cota history" ON cota_history;

-- Enable Row Level Security on all tables
ALTER TABLE profiles_pf ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_pj ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cota_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES_PF POLICIES
-- ============================================

-- Allow users to insert their own profile (during signup)
-- The id must match the authenticated user's UID
CREATE POLICY "Users can insert own profile"
ON profiles_pf FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid()::text);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON profiles_pf FOR SELECT
TO authenticated
USING (id = auth.uid()::text);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles_pf FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles_pf FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles_pf
    WHERE id = auth.uid()::text AND role = 'ADMIN'
  )
);

-- ============================================
-- PROFILES_PJ POLICIES
-- ============================================

-- Allow users to insert their own company profiles
CREATE POLICY "Users can insert own company profile"
ON profiles_pj FOR INSERT
TO authenticated
WITH CHECK (pf_id = auth.uid()::text);

-- Allow users to view their own company profiles
CREATE POLICY "Users can view own company profiles"
ON profiles_pj FOR SELECT
TO authenticated
USING (pf_id = auth.uid()::text);

-- Allow users to update their own company profiles
CREATE POLICY "Users can update own company profiles"
ON profiles_pj FOR UPDATE
TO authenticated
USING (pf_id = auth.uid()::text)
WITH CHECK (pf_id = auth.uid()::text);

-- ============================================
-- COTAS POLICIES
-- ============================================

-- Allow anyone authenticated to view available cotas
CREATE POLICY "Anyone can view available cotas"
ON cotas FOR SELECT
TO authenticated
USING (status = 'AVAILABLE');

-- Allow sellers to view their own cotas (any status)
CREATE POLICY "Sellers can view own cotas"
ON cotas FOR SELECT
TO authenticated
USING (seller_id = auth.uid()::text);

-- Allow users to insert their own cotas
CREATE POLICY "Users can insert own cotas"
ON cotas FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid()::text);

-- Allow sellers to update their own available cotas
CREATE POLICY "Sellers can update own available cotas"
ON cotas FOR UPDATE
TO authenticated
USING (seller_id = auth.uid()::text AND status = 'AVAILABLE')
WITH CHECK (seller_id = auth.uid()::text);

-- ============================================
-- PROPOSALS POLICIES
-- ============================================

-- Allow buyers to view their own proposals
CREATE POLICY "Buyers can view own proposals"
ON proposals FOR SELECT
TO authenticated
USING (buyer_pf_id = auth.uid()::text);

-- Allow sellers to view proposals on their cotas
CREATE POLICY "Sellers can view proposals on their cotas"
ON proposals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id = proposals.cota_id
    AND cotas.seller_id = auth.uid()::text
  )
);

-- Allow users to insert proposals (not on own cotas)
CREATE POLICY "Users can insert proposals"
ON proposals FOR INSERT
TO authenticated
WITH CHECK (
  buyer_pf_id = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id = cota_id
    AND cotas.seller_id = auth.uid()::text
  )
);

-- ============================================
-- DOCUMENTS POLICIES
-- ============================================

-- Allow users to view their own documents
CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
TO authenticated
USING (owner_id = auth.uid()::text);

-- Allow users to insert their own documents
CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid()::text);

-- ============================================
-- HISTORY TABLES (read-only for users)
-- ============================================

-- Proposal history - buyers can view history of their proposals
CREATE POLICY "Buyers can view own proposal history"
ON proposal_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = proposal_history.proposal_id
    AND proposals.buyer_pf_id = auth.uid()::text
  )
);

-- Cota history - sellers can view history of their cotas
CREATE POLICY "Sellers can view own cota history"
ON cota_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id = cota_history.cota_id
    AND cotas.seller_id = auth.uid()::text
  )
);

-- ============================================
-- PUBLIC ACCESS FOR COTAS (for homepage)
-- ============================================

-- Allow anonymous users to view available cotas on homepage
CREATE POLICY "Public can view available cotas"
ON cotas FOR SELECT
TO anon
USING (status = 'AVAILABLE');

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Consórcio Market
-- ============================================
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- This is the SINGLE SOURCE OF TRUTH for all RLS policies and Supabase functions
--
-- ============================================

-- ============================================
-- SECTION 0: SCHEMA PERMISSIONS
-- Grant access to authenticated and anonymous users
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ============================================
-- CLEANUP: Disable old trigger
-- Profile creation is now handled in frontend (AuthContext.tsx)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user(); -- Uncomment to fully remove

-- ============================================
-- HELPER FUNCTION FOR ADMIN CHECK
-- ============================================
-- This function bypasses RLS completely using SECURITY DEFINER
-- The function runs with the privileges of the function owner (postgres)
-- which bypasses all RLS policies

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Direct query that bypasses RLS due to SECURITY DEFINER
  SELECT role INTO user_role
  FROM profiles_pf
  WHERE id = auth.uid();

  RETURN user_role = 'ADMIN';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- HELPER FUNCTION TO GET OWN PROFILE (BYPASSES RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF profiles_pf
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM profiles_pf WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ============================================
-- PROFILES_PF TABLE
-- ============================================

-- Enable RLS
ALTER TABLE profiles_pf ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles_pf;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles_pf;

-- Insert policy: Users can create their own profile OR admin can insert any
CREATE POLICY "Users can insert their own profile"
ON profiles_pf FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = id::text OR public.is_admin());

-- Select policy: Users can read their own profile OR admin can read all
CREATE POLICY "Users can read their own profile"
ON profiles_pf FOR SELECT TO authenticated
USING (auth.uid()::text = id::text OR public.is_admin());

-- Update policy: Users can update their own profile OR admin can update all
CREATE POLICY "Users can update their own profile"
ON profiles_pf FOR UPDATE TO authenticated
USING (auth.uid()::text = id::text OR public.is_admin())
WITH CHECK (auth.uid()::text = id::text OR public.is_admin());

-- Delete policy: Admin can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles_pf;
CREATE POLICY "Admins can delete profiles"
ON profiles_pf FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- PROFILES_PJ TABLE
-- ============================================

-- Enable RLS
ALTER TABLE profiles_pj ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own PJ" ON profiles_pj;
DROP POLICY IF EXISTS "Users can read their own PJ" ON profiles_pj;
DROP POLICY IF EXISTS "Users can update their own PJ" ON profiles_pj;
DROP POLICY IF EXISTS "Users can delete their own PJ" ON profiles_pj;
DROP POLICY IF EXISTS "Admins can read all PJ" ON profiles_pj;
DROP POLICY IF EXISTS "Admins can update all PJ" ON profiles_pj;

-- Insert policy: Users can create PJ linked to themselves OR admin can insert any
CREATE POLICY "Users can insert their own PJ"
ON profiles_pj FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = pf_id::text OR public.is_admin());

-- Select policy: Users can read their own PJ OR admin can read all
CREATE POLICY "Users can read their own PJ"
ON profiles_pj FOR SELECT TO authenticated
USING (auth.uid()::text = pf_id::text OR public.is_admin());

-- Update policy: Users can update their own PJ OR admin can update all
CREATE POLICY "Users can update their own PJ"
ON profiles_pj FOR UPDATE TO authenticated
USING (auth.uid()::text = pf_id::text OR public.is_admin())
WITH CHECK (auth.uid()::text = pf_id::text OR public.is_admin());

-- Delete policy: Users can delete their own PJ OR admin can delete all
CREATE POLICY "Users can delete their own PJ"
ON profiles_pj FOR DELETE TO authenticated
USING (auth.uid()::text = pf_id::text OR public.is_admin());

-- ============================================
-- COTAS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read available cotas" ON cotas;
DROP POLICY IF EXISTS "Users can insert their own cotas" ON cotas;
DROP POLICY IF EXISTS "Users can update their own cotas" ON cotas;
DROP POLICY IF EXISTS "Users can delete their own cotas" ON cotas;
DROP POLICY IF EXISTS "Admins can manage all cotas" ON cotas;

-- Select policy: Anyone (authenticated) can read all cotas
CREATE POLICY "Anyone can read available cotas"
ON cotas FOR SELECT TO authenticated
USING (true);

-- Insert policy: Users can create their own cotas OR admin can insert any
CREATE POLICY "Users can insert their own cotas"
ON cotas FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = seller_id::text OR public.is_admin());

-- Update policy: Users can update their own cotas OR admin can update all
CREATE POLICY "Users can update their own cotas"
ON cotas FOR UPDATE TO authenticated
USING (auth.uid()::text = seller_id::text OR public.is_admin())
WITH CHECK (auth.uid()::text = seller_id::text OR public.is_admin());

-- Delete policy: Users can delete their own cotas OR admin can delete all
CREATE POLICY "Users can delete their own cotas"
ON cotas FOR DELETE TO authenticated
USING (auth.uid()::text = seller_id::text OR public.is_admin());

-- ============================================
-- PROPOSALS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Sellers can read proposals on their cotas" ON proposals;
DROP POLICY IF EXISTS "Admins can manage all proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON proposals;

-- Select policy: Buyers can read their own proposals, sellers can read proposals on their cotas, admin can read all
CREATE POLICY "Users can read their own proposals"
ON proposals FOR SELECT TO authenticated
USING (
  auth.uid()::text = buyer_pf_id::text
  OR EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id::text = proposals.cota_id::text AND cotas.seller_id::text = auth.uid()::text
  )
  OR public.is_admin()
);

-- Insert policy: Users can create proposals (but not on their own cotas)
CREATE POLICY "Users can insert proposals"
ON proposals FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = buyer_pf_id::text
  AND NOT EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id::text = cota_id::text AND cotas.seller_id::text = auth.uid()::text
  )
);

-- Update policy: Admin can update all proposals
CREATE POLICY "Users can update their own proposals"
ON proposals FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Delete policy: Admin can delete proposals
CREATE POLICY "Admins can manage all proposals"
ON proposals FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

-- Select policy: Users can read their own documents (PF, PJ, or COTA they own) OR admin can read all
-- Also allows any authenticated user to read COTA_STATEMENT documents for available/reserved cotas (for buyers)
CREATE POLICY "Users can read their own documents"
ON documents FOR SELECT TO authenticated
USING (
  -- PF documents: owner_id matches user
  (owner_type = 'PF' AND owner_id = auth.uid()::text)
  OR
  -- PJ documents: user owns the PJ
  (owner_type = 'PJ' AND EXISTS (
    SELECT 1 FROM profiles_pj WHERE id::text = owner_id AND pf_id::text = auth.uid()::text
  ))
  OR
  -- COTA documents: user owns the cota
  (owner_type = 'COTA' AND EXISTS (
    SELECT 1 FROM cotas WHERE id::text = owner_id AND seller_id::text = auth.uid()::text
  ))
  OR
  -- Any authenticated user can read COTA_STATEMENT documents for available/reserved cotas (buyers need to see this)
  (owner_type = 'COTA' AND document_type = 'COTA_STATEMENT' AND EXISTS (
    SELECT 1 FROM cotas WHERE id::text = owner_id AND status IN ('AVAILABLE', 'RESERVED')
  ))
  OR
  -- Admin can read all
  public.is_admin()
);

-- Insert policy: Users can insert their own documents OR admin can insert any
CREATE POLICY "Users can insert their own documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR
  (owner_type = 'PF' AND owner_id = auth.uid()::text)
  OR
  (owner_type = 'PJ' AND EXISTS (
    SELECT 1 FROM profiles_pj WHERE id::text = owner_id AND pf_id::text = auth.uid()::text
  ))
  OR
  (owner_type = 'COTA' AND EXISTS (
    SELECT 1 FROM cotas WHERE id::text = owner_id AND seller_id::text = auth.uid()::text
  ))
);

-- Update policy: Users can update their own documents (only if not yet reviewed) OR admin can update all
CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR (
    status IN ('PENDING_UPLOAD', 'REJECTED')
    AND (
      (owner_type = 'PF' AND owner_id = auth.uid()::text)
      OR
      (owner_type = 'PJ' AND EXISTS (
        SELECT 1 FROM profiles_pj WHERE id::text = owner_id AND pf_id::text = auth.uid()::text
      ))
      OR
      (owner_type = 'COTA' AND EXISTS (
        SELECT 1 FROM cotas WHERE id::text = owner_id AND seller_id::text = auth.uid()::text
      ))
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    (owner_type = 'PF' AND owner_id = auth.uid()::text)
    OR
    (owner_type = 'PJ' AND EXISTS (
      SELECT 1 FROM profiles_pj WHERE id::text = owner_id AND pf_id::text = auth.uid()::text
    ))
    OR
    (owner_type = 'COTA' AND EXISTS (
      SELECT 1 FROM cotas WHERE id::text = owner_id AND seller_id::text = auth.uid()::text
    ))
  )
);

-- Delete policy: Users can delete their own documents (only if not yet reviewed) OR admin can delete all
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE TO authenticated
USING (
  public.is_admin()
  OR (
    status IN ('PENDING_UPLOAD', 'REJECTED')
    AND (
      (owner_type = 'PF' AND owner_id = auth.uid()::text)
      OR
      (owner_type = 'PJ' AND EXISTS (
        SELECT 1 FROM profiles_pj WHERE id::text = owner_id AND pf_id::text = auth.uid()::text
      ))
      OR
      (owner_type = 'COTA' AND EXISTS (
        SELECT 1 FROM cotas WHERE id::text = owner_id AND seller_id::text = auth.uid()::text
      ))
    )
  )
);

-- ============================================
-- PROPOSAL_HISTORY TABLE
-- ============================================

-- Enable RLS
ALTER TABLE proposal_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read history of their proposals" ON proposal_history;
DROP POLICY IF EXISTS "Admins can manage all history" ON proposal_history;
DROP POLICY IF EXISTS "Admins can insert history" ON proposal_history;
DROP POLICY IF EXISTS "Admins can update history" ON proposal_history;
DROP POLICY IF EXISTS "Admins can delete history" ON proposal_history;

-- Select policy: Users can read history of their own proposals OR admin can read all
CREATE POLICY "Users can read history of their proposals"
ON proposal_history FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id::text = proposal_history.proposal_id::text
    AND (
      proposals.buyer_pf_id::text = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM cotas
        WHERE cotas.id::text = proposals.cota_id::text AND cotas.seller_id::text = auth.uid()::text
      )
    )
  )
);

-- Insert policy: Admin can insert history
CREATE POLICY "Admins can insert history"
ON proposal_history FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Update policy: Admin can update history
CREATE POLICY "Admins can update history"
ON proposal_history FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Delete policy: Admin can delete history
CREATE POLICY "Admins can delete history"
ON proposal_history FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- COTA_HISTORY TABLE
-- ============================================

-- Enable RLS
ALTER TABLE cota_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read history of their cotas" ON cota_history;
DROP POLICY IF EXISTS "Admins can manage all cota history" ON cota_history;
DROP POLICY IF EXISTS "Admins can insert cota history" ON cota_history;
DROP POLICY IF EXISTS "Admins can update cota history" ON cota_history;
DROP POLICY IF EXISTS "Admins can delete cota history" ON cota_history;

-- Select policy: Users can read history of their own cotas OR admin can read all
CREATE POLICY "Users can read history of their cotas"
ON cota_history FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM cotas
    WHERE cotas.id::text = cota_history.cota_id::text AND cotas.seller_id::text = auth.uid()::text
  )
);

-- Insert policy: Admin can insert cota history
CREATE POLICY "Admins can insert cota history"
ON cota_history FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Update policy: Admin can update cota history
CREATE POLICY "Admins can update cota history"
ON cota_history FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Delete policy: Admin can delete cota history
CREATE POLICY "Admins can delete cota history"
ON cota_history FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- PUBLIC READ ACCESS FOR COTAS
-- ============================================
-- Allow unauthenticated users to view available and reserved cotas
-- This improves SEO and user experience (users can browse before signing up)

DROP POLICY IF EXISTS "Public can read available cotas" ON cotas;
CREATE POLICY "Public can read available cotas"
ON cotas FOR SELECT TO anon
USING (status IN ('AVAILABLE', 'RESERVED'));

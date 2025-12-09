-- Final RLS fix - ensure UPDATE has WITH CHECK clause

-- Drop and recreate UPDATE policies with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update own company profiles" ON profiles_pj;

-- profiles_pf UPDATE with WITH CHECK
CREATE POLICY "Users can update own profile"
ON profiles_pf FOR UPDATE
TO authenticated
USING (id = CAST(auth.uid() AS TEXT))
WITH CHECK (id = CAST(auth.uid() AS TEXT));

-- profiles_pj UPDATE with WITH CHECK
CREATE POLICY "Users can update own company profiles"
ON profiles_pj FOR UPDATE
TO authenticated
USING (pf_id = CAST(auth.uid() AS TEXT))
WITH CHECK (pf_id = CAST(auth.uid() AS TEXT));

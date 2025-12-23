-- Enable RLS on profiles_pf table
ALTER TABLE profiles_pf ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles_pf policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles_pf;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles_pf;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles_pf
FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles_pf
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert their own profile"
ON profiles_pf
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = id);

-- Enable RLS on profiles_pj table
ALTER TABLE profiles_pj ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles_pj policies if they exist
DROP POLICY IF EXISTS "Users can view their own PJ profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can insert their own PJ profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can update their own PJ profiles" ON profiles_pj;
DROP POLICY IF EXISTS "Users can delete their own PJ profiles" ON profiles_pj;

-- Allow users to view their own PJ profiles
CREATE POLICY "Users can view their own PJ profiles"
ON profiles_pj
FOR SELECT
TO authenticated
USING (auth.uid()::text = pf_id);

-- Allow users to insert their own PJ profiles
CREATE POLICY "Users can insert their own PJ profiles"
ON profiles_pj
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = pf_id);

-- Allow users to update their own PJ profiles
CREATE POLICY "Users can update their own PJ profiles"
ON profiles_pj
FOR UPDATE
TO authenticated
USING (auth.uid()::text = pf_id)
WITH CHECK (auth.uid()::text = pf_id);

-- Allow users to delete their own PJ profiles
CREATE POLICY "Users can delete their own PJ profiles"
ON profiles_pj
FOR DELETE
TO authenticated
USING (auth.uid()::text = pf_id);

-- Enable RLS on cotas table if not already enabled
ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public users can view available cotas" ON cotas;
DROP POLICY IF EXISTS "Authenticated users can view all cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can insert their own cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can update their own cotas" ON cotas;
DROP POLICY IF EXISTS "Sellers can delete their own cotas" ON cotas;

-- Allow public (unauthenticated) users to READ available and reserved cotas
CREATE POLICY "Public users can view available cotas"
ON cotas
FOR SELECT
TO anon
USING (status::text IN ('AVAILABLE', 'RESERVED'));

-- Allow authenticated users to READ all cotas
CREATE POLICY "Authenticated users can view all cotas"
ON cotas
FOR SELECT
TO authenticated
USING (true);

-- Allow sellers to INSERT their own cotas
CREATE POLICY "Sellers can insert their own cotas"
ON cotas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = seller_id);

-- Allow sellers to UPDATE their own cotas
CREATE POLICY "Sellers can update their own cotas"
ON cotas
FOR UPDATE
TO authenticated
USING (auth.uid()::text = seller_id)
WITH CHECK (auth.uid()::text = seller_id);

-- Allow sellers to DELETE their own cotas
CREATE POLICY "Sellers can delete their own cotas"
ON cotas
FOR DELETE
TO authenticated
USING (auth.uid()::text = seller_id);

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing documents policies if they exist
DROP POLICY IF EXISTS "Users can view their own PF documents" ON documents;
DROP POLICY IF EXISTS "Users can view their PJ documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own PF documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their PJ documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own PF documents" ON documents;
DROP POLICY IF EXISTS "Users can update their PJ documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own PF documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their PJ documents" ON documents;

-- Allow users to view their own PF documents
CREATE POLICY "Users can view their own PF documents"
ON documents
FOR SELECT
TO authenticated
USING (owner_type = 'PF' AND auth.uid()::text = owner_id);

-- Allow users to view their PJ documents (where they are the PJ owner)
CREATE POLICY "Users can view their PJ documents"
ON documents
FOR SELECT
TO authenticated
USING (
  owner_type = 'PJ' AND
  EXISTS (
    SELECT 1 FROM profiles_pj
    WHERE profiles_pj.id = documents.owner_id
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

-- Allow users to insert their own PF documents
CREATE POLICY "Users can insert their own PF documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (owner_type = 'PF' AND auth.uid()::text = owner_id);

-- Allow users to insert their PJ documents (where they are the PJ owner)
CREATE POLICY "Users can insert their PJ documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (
  owner_type = 'PJ' AND
  EXISTS (
    SELECT 1 FROM profiles_pj
    WHERE profiles_pj.id = documents.owner_id
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

-- Allow users to update their own PF documents
CREATE POLICY "Users can update their own PF documents"
ON documents
FOR UPDATE
TO authenticated
USING (owner_type = 'PF' AND auth.uid()::text = owner_id)
WITH CHECK (owner_type = 'PF' AND auth.uid()::text = owner_id);

-- Allow users to update their PJ documents (where they are the PJ owner)
CREATE POLICY "Users can update their PJ documents"
ON documents
FOR UPDATE
TO authenticated
USING (
  owner_type = 'PJ' AND
  EXISTS (
    SELECT 1 FROM profiles_pj
    WHERE profiles_pj.id = documents.owner_id
    AND profiles_pj.pf_id = auth.uid()::text
  )
)
WITH CHECK (
  owner_type = 'PJ' AND
  EXISTS (
    SELECT 1 FROM profiles_pj
    WHERE profiles_pj.id = documents.owner_id
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

-- Allow users to delete their own PF documents
CREATE POLICY "Users can delete their own PF documents"
ON documents
FOR DELETE
TO authenticated
USING (owner_type = 'PF' AND auth.uid()::text = owner_id);

-- Allow users to delete their PJ documents (where they are the PJ owner)
CREATE POLICY "Users can delete their PJ documents"
ON documents
FOR DELETE
TO authenticated
USING (
  owner_type = 'PJ' AND
  EXISTS (
    SELECT 1 FROM profiles_pj
    WHERE profiles_pj.id = documents.owner_id
    AND profiles_pj.pf_id = auth.uid()::text
  )
);

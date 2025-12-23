-- STORAGE POLICIES: documents-pf

DROP POLICY IF EXISTS "Users can upload own PF documents" ON storage.objects;
CREATE POLICY "Users can upload own PF documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own PF documents" ON storage.objects;
CREATE POLICY "Users can view own PF documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Users can update own PF documents" ON storage.objects;
CREATE POLICY "Users can update own PF documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own PF documents" ON storage.objects;
CREATE POLICY "Users can delete own PF documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents-pf'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

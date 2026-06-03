-- Photos progression (face / profil / dos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "progress_photos_read" ON storage.objects;
CREATE POLICY "progress_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'progress-photos');

DROP POLICY IF EXISTS "progress_photos_insert" ON storage.objects;
CREATE POLICY "progress_photos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress_photos_update" ON storage.objects;
CREATE POLICY "progress_photos_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

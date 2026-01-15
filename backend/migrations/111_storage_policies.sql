-- Enable RLS on storage.objects if not already enabled (it usually is)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Public Read Access to 'post-media'
CREATE POLICY "Post Media Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post-media' );

-- 2. Policy for Authenticated Uploads to 'post-media'
-- Allow any authenticated user to upload to the bucket
CREATE POLICY "Post Media Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-media' AND
  auth.role() = 'authenticated'
);

-- 3. Policy for Owners to Update their own files
CREATE POLICY "Post Media Owner Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-media' AND
  auth.uid() = owner
);

-- 4. Policy for Owners to Delete their own files
CREATE POLICY "Post Media Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-media' AND
  auth.uid() = owner
);

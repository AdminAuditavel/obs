-- 100_create_post_media_bucket.sql
-- Create and configure the 'post-media' bucket
-- Reference: https://supabase.com/docs/guides/storage/security/access-control

BEGIN;

-- 1. Create Bucket (if not exists)
-- We enforce privacy (public = false) and constraints directly on the bucket configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'post-media', 
    'post-media', 
    false, 
    10485760, -- 10MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Security Policies (RLS) on storage.objects

-- Allow Authenticated uploads (INSERT)
-- User must be authenticated.
-- Note: file_size_limit and mime_type are already checked by the bucket config above,
-- but policies can add granular checks if needed.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload post media'
    ) THEN
        CREATE POLICY "Authenticated users can upload post media"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK ( bucket_id = 'post-media' );
    END IF;
END$$;

-- Allow Owners to update/delete their own files (optional but good practice)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own post media'
    ) THEN
        CREATE POLICY "Users can update own post media"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING ( bucket_id = 'post-media' AND owner = auth.uid() );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own post media'
    ) THEN
        CREATE POLICY "Users can delete own post media"
        ON storage.objects FOR DELETE
        TO authenticated
        USING ( bucket_id = 'post-media' AND owner = auth.uid() );
    END IF;
END$$;

-- NO SELECT POLICY specified for "Authenticated" generally.
-- Ensuring "Only possible to download... using Signed URLs":
-- Without a SELECT policy for 'authenticated', users cannot list or download blindly.
-- Valid Signed URLs (created by service role or user with permission) allow access.
-- If the Client needs to generate Signed URLs, they need SELECT permission.
-- Assuming Backend-generation of Signed URLs (Strict model) OR Owner-generation.
-- Let's allow Owners to SELECT their own files to generate signed URLs if needed?
-- The prompt implies strict "Signed URLs" access.
-- We will enable SELECT for OWNER only. Other users must receive a signed URL (from backend).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can access own post media'
    ) THEN
        CREATE POLICY "Users can access own post media"
        ON storage.objects FOR SELECT
        TO authenticated
        USING ( bucket_id = 'post-media' AND owner = auth.uid() );
    END IF;
END$$;

COMMIT;

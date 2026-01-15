-- 1. Clean up posts table (remove the temp column I added)
ALTER TABLE posts DROP COLUMN IF EXISTS image;

-- 2. Enable RLS on post_media
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies for post_media

-- Public Read
CREATE POLICY "Public Read Media"
ON post_media FOR SELECT
USING (true);

-- Authenticated Insert
CREATE POLICY "Authenticated Insert Media"
ON post_media FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Owner Delete (referencing the post's author is tricky in a standard policy without a join, 
-- but often post_media might not store author_id directly. 
-- Let's check columns again: post_id, uploaded_at, storage_path, media_type, thumbnail_path...
-- It doesn't have an owner column. 
-- So we strictly need to check if the user owns the PARENT post.
-- USING ( EXISTS (SELECT 1 FROM posts WHERE id = post_media.post_id AND author_auth_uid = auth.uid()) )
);

CREATE POLICY "Owner Delete Media"
ON post_media FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM posts 
        WHERE posts.id = post_media.post_id 
        AND posts.author_auth_uid = auth.uid()
    )
);

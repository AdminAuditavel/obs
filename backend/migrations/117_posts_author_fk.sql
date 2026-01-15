-- Add Foreign Key for author_auth_uid to user_profiles
-- This enables PostgREST resource embedding (joins)

DO $$ 
BEGIN
  -- First, we try to add the constraint. 
  -- If there are orphaned records (posts with authors that don't have profiles), this might fail.
  -- In that case, we might need to create simplified profiles or delete the posts.
  -- For now, let's assume checks pass or we clean up.
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_author_auth_uid_fkey') THEN
    ALTER TABLE posts 
    ADD CONSTRAINT posts_author_auth_uid_fkey 
    FOREIGN KEY (author_auth_uid) 
    REFERENCES user_profiles(auth_uid)
    ON DELETE SET NULL; -- If user is deleted, keep post but nullify author? Or Cascade? Set Null seems safer to preserve content.
  END IF;
END $$;

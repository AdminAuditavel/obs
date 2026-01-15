-- Migration: 123_fix_relationships.sql
-- Add missing Foreign Keys to enable Supabase joins (Relations)

BEGIN;

-- 1. Comments: author_auth_uid -> user_profiles.auth_uid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_author_auth_uid_fkey') THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_author_auth_uid_fkey
    FOREIGN KEY (author_auth_uid)
    REFERENCES public.user_profiles(auth_uid)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Post Reports: reporter_auth_uid -> user_profiles.auth_uid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reports_reporter_auth_uid_fkey') THEN
    ALTER TABLE public.post_reports
    ADD CONSTRAINT post_reports_reporter_auth_uid_fkey
    FOREIGN KEY (reporter_auth_uid)
    REFERENCES public.user_profiles(auth_uid)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Post Confirmations: confirmer_auth_uid -> user_profiles.auth_uid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_confirmations_confirmer_auth_uid_fkey') THEN
    ALTER TABLE public.post_confirmations
    ADD CONSTRAINT post_confirmations_confirmer_auth_uid_fkey
    FOREIGN KEY (confirmer_auth_uid)
    REFERENCES public.user_profiles(auth_uid)
    ON DELETE CASCADE; -- Cascade because of unique constraint and logic
  END IF;
END $$;

-- 4. Post Likes: user_auth_uid -> user_profiles.auth_uid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_likes_user_auth_uid_fkey') THEN
    ALTER TABLE public.post_likes
    ADD CONSTRAINT post_likes_user_auth_uid_fkey
    FOREIGN KEY (user_auth_uid)
    REFERENCES public.user_profiles(auth_uid)
    ON DELETE CASCADE; -- Cascade because column is NOT NULL unique constraint
  END IF;
END $$;

COMMIT;

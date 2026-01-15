-- Migration: 122_create_post_likes.sql
-- Create post_likes table and toggle_like RPC

BEGIN;

-- 1. Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_auth_uid uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_auth_uid)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_auth_uid ON public.post_likes(user_auth_uid);

-- 2. Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_likes' AND policyname='public_view_likes') THEN
    EXECUTE 'CREATE POLICY public_view_likes ON public.post_likes FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_likes' AND policyname='auth_insert_likes') THEN
    EXECUTE 'CREATE POLICY auth_insert_likes ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_auth_uid)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_likes' AND policyname='owner_delete_likes') THEN
    EXECUTE 'CREATE POLICY owner_delete_likes ON public.post_likes FOR DELETE USING (auth.uid() = user_auth_uid)';
  END IF;
END$$;

-- 4. RPC: Toggle Like
CREATE OR REPLACE FUNCTION public.toggle_like(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liked boolean;
  v_count int;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already liked
  IF EXISTS (SELECT 1 FROM public.post_likes WHERE post_id = p_post_id AND user_auth_uid = auth.uid()) THEN
    -- Unlike
    DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_auth_uid = auth.uid();
    v_liked := false;
  ELSE
    -- Like
    INSERT INTO public.post_likes (post_id, user_auth_uid) VALUES (p_post_id, auth.uid());
    v_liked := true;
    
    -- Audit Log (optional for likes, maybe skip to avoid noise, or keep separate)
    -- Keeping it simple for now, no heavy audit for likes unless requested.
  END IF;

  -- Get new count
  SELECT count(*)::int INTO v_count FROM public.post_likes WHERE post_id = p_post_id;

  RETURN jsonb_build_object(
    'liked', v_liked,
    'count', v_count
  );
END;
$$;

-- 5. RPC: Get User Interactions (Batch)
-- Helper to fetch "liked_by_me" and "confirmed_by_me" for a list of posts or single post
-- This helps the frontend know the state without fetching all records.
-- However, for now, we can just use the standard JOINs in the main query if possible, 
-- or a specific RPC to hydrate "is_liked" and "is_confirmed".

COMMIT;

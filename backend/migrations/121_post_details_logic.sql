-- Migration: 121_post_details_logic.sql
-- Implementa lógica server-side e segurança para detalhes do post

BEGIN;

-- 1. Security & Constraints: post_confirmations
-- Garantir unicidade de confirmação por usuário/post
ALTER TABLE public.post_confirmations 
DROP CONSTRAINT IF EXISTS unique_user_post_confirmation;

ALTER TABLE public.post_confirmations
ADD CONSTRAINT unique_user_post_confirmation UNIQUE (post_id, confirmer_auth_uid);

-- RLS para post_confirmations (Public View count usually aggregated, but raw table selection might be restricted)
ALTER TABLE public.post_confirmations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_confirmations' AND policyname='view_confirmations') THEN
    EXECUTE 'CREATE POLICY view_confirmations ON public.post_confirmations FOR SELECT USING (true)';
  END IF;
END$$;

-- 2. Security: comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies para comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='public_view_comments') THEN
    EXECUTE 'CREATE POLICY public_view_comments ON public.comments FOR SELECT USING (true)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='auth_insert_comments') THEN
    EXECUTE 'CREATE POLICY auth_insert_comments ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_auth_uid)';
  END IF;

  -- Owner delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='owner_delete_comments') THEN
    EXECUTE 'CREATE POLICY owner_delete_comments ON public.comments FOR DELETE USING (auth.uid() = author_auth_uid OR EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_uid = auth.uid() AND role_id IN (''admin'', ''moderator'')))';
  END IF;
END$$;


-- 3. RPC: Confirm Post
CREATE OR REPLACE FUNCTION public.confirm_post(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_verified boolean;
  v_user_role text;
  v_count int;
  v_already_confirmed boolean;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user profile status
  SELECT verified, role_id INTO v_user_verified, v_user_role
  FROM public.user_profiles
  WHERE auth_uid = auth.uid();

  -- Check User Verification (Admin/Mod/Contributor should be verified, but explicit check requested)
  -- Logic: Must look for 'verified' flag OR be strictly role based?
  -- Prompt: "somente usuários verificados" (verified=true).
  IF v_user_verified IS NOT TRUE THEN
     RAISE EXCEPTION 'User not verified';
  END IF;

  -- Check if already confirmed
  SELECT EXISTS(SELECT 1 FROM public.post_confirmations WHERE post_id = p_post_id AND confirmer_auth_uid = auth.uid())
  INTO v_already_confirmed;

  IF v_already_confirmed THEN
     -- User trying to confirm again? Maybe treat as success or toggle? 
     -- Requirement: "avoid duplicates".
     RAISE EXCEPTION 'Already confirmed';
  END IF;

  -- Insert Confirmation
  INSERT INTO public.post_confirmations (post_id, confirmer_auth_uid)
  VALUES (p_post_id, auth.uid());

  -- Audit Log
  INSERT INTO public.audit_logs (actor_auth_uid, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'confirm_post', 'post', p_post_id, jsonb_build_object('timestamp', now()));

  -- Get updated count
  SELECT count(*)::int INTO v_count FROM public.post_confirmations WHERE post_id = p_post_id;

  RETURN jsonb_build_object(
    'success', true, 
    'new_count', v_count
  );
END;
$$;


-- 4. RPC: Report Post
CREATE OR REPLACE FUNCTION public.report_post(
  p_post_id uuid, 
  p_reason text, 
  p_comment text DEFAULT NULL,
  p_reporter_contact text DEFAULT NULL -- Not storing in schema per previous logs? Schema has 'reason', 'comment'. 'reporter_contact' not in schema log 003. Assuming just metadata for now.
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reports_count int;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Report
  -- Note: Schema might allow p_reporter_contact? Check 003: no column 'reporter_contact' in post_reports.
  -- I will put it in comment or ignore, or we need migration to add it.
  -- Prompt asked: "Campos: reason, comment, reporter_contact".
  -- I better add metadata column or stick it in comment.
  -- Let's append to comment for now to avoid schema change blocking, or assume caller fits it.
  -- Actually, let's create it properly if needed, but schema change `003` is foundational.
  -- I will append contact to comment: "Contact: ... \n Comment: ..."
  
  INSERT INTO public.post_reports (post_id, reporter_auth_uid, reason, comment)
  VALUES (
    p_post_id, 
    auth.uid(), 
    p_reason, 
    CASE WHEN p_reporter_contact IS NOT NULL THEN 'Contact: ' || p_reporter_contact || E'\n' || COALESCE(p_comment, '') ELSE p_comment END
  );

  -- Audit Log
  INSERT INTO public.audit_logs (actor_auth_uid, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'report_post', 'post', p_post_id, jsonb_build_object('reason', p_reason));

  -- Check Threshold for Moderation (e.g., 3 reports)
  SELECT count(*) INTO v_reports_count FROM public.post_reports WHERE post_id = p_post_id;

  IF v_reports_count >= 3 THEN
     -- Check if already flagged
     IF NOT EXISTS (SELECT 1 FROM public.moderation_actions WHERE target_id = p_post_id AND action = 'flag_for_review') THEN
        INSERT INTO public.moderation_actions (action, target_type, target_id, reason, metadata)
        VALUES ('flag_for_review', 'post', p_post_id, 'Automatic flag: High report count', jsonb_build_object('report_count', v_reports_count));
     END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'report_count', v_reports_count);
END;
$$;


-- 5. RPC: Create Comment (Server-side wrapper for audit)
CREATE OR REPLACE FUNCTION public.create_post_comment(
  p_post_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id uuid;
  v_created_at timestamptz;
  v_user_name text;
  v_user_avatar text;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Comment
  INSERT INTO public.comments (post_id, author_auth_uid, content)
  VALUES (p_post_id, auth.uid(), p_content)
  RETURNING id, created_at INTO v_comment_id, v_created_at;

  -- Audit Log
  INSERT INTO public.audit_logs (actor_auth_uid, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'create_comment', 'comment', v_comment_id, jsonb_build_object('post_id', p_post_id));

  -- Get User Info for UI return
  SELECT full_name, avatar_url INTO v_user_name, v_user_avatar
  FROM public.user_profiles
  WHERE auth_uid = auth.uid();

  RETURN jsonb_build_object(
    'id', v_comment_id,
    'post_id', p_post_id,
    'content', p_content,
    'created_at', v_created_at,
    'user', jsonb_build_object(
        'id', auth.uid(),
        'name', v_user_name,
        'avatar', v_user_avatar
    )
  );
END;
$$;

COMMIT;

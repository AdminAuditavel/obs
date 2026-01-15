-- 009_rpc_claim_invite.sql
-- Function to atomically check and decrement invite uses
BEGIN;

CREATE OR REPLACE FUNCTION public.claim_invite(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as owner (service role) to access invites
AS $$
DECLARE
  v_invite record;
BEGIN
  -- Select and Lock
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF v_invite.revoked THEN
    RAISE EXCEPTION 'invite_revoked';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  IF v_invite.uses_left <= 0 THEN
    RAISE EXCEPTION 'invite_has_no_uses_left';
  END IF;

  -- Decrement
  UPDATE public.invites
  SET uses_left = uses_left - 1,
      used_at = now()
  WHERE id = v_invite.id;

  -- Return minimal info needed by the caller
  RETURN jsonb_build_object(
    'id', v_invite.id,
    'role_id', v_invite.role_id,
    'invited_email', v_invite.invited_email,
    'uses_left', v_invite.uses_left - 1
  );
END;
$$;

COMMIT;

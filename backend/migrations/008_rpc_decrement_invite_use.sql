-- 008_rpc_decrement_invite_use.sql
BEGIN;

-- remove se já existir (idempotente)
DROP FUNCTION IF EXISTS public.decrement_invite_use(uuid);

CREATE FUNCTION public.decrement_invite_use(invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  curr_uses int;
BEGIN
  -- lock the row to avoid races
  SELECT uses_left INTO curr_uses
  FROM public.invites
  WHERE id = invite_id
  FOR UPDATE;

  IF curr_uses IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF curr_uses > 0 THEN
    UPDATE public.invites
    SET uses_left = uses_left - 1,
        used_at = COALESCE(used_at, now())
    WHERE id = invite_id;
  ELSE
    RAISE EXCEPTION 'invite_has_no_uses_left';
  END IF;
END;
$$;

COMMIT;

-- Migration: 126_fix_confirmations_rls.sql
-- Ensure RLS is enabled and allows public read access for counting

BEGIN;

-- 1. Enable RLS (idempotent if already enabled)
ALTER TABLE public.post_confirmations ENABLE ROW LEVEL SECURITY;

-- 2. Add Select Policy (Allow all to read/count)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_confirmations' AND policyname='public_select_confirmations'
  ) THEN
    EXECUTE 'CREATE POLICY public_select_confirmations ON public.post_confirmations FOR SELECT USING (true)';
  END IF;
END$$;

-- 3. Add Insert Policy (Authenticated users) - Just for consistency, though RPC usually handles inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_confirmations' AND policyname='insert_confirmations_auth'
  ) THEN
    EXECUTE 'CREATE POLICY insert_confirmations_auth ON public.post_confirmations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END$$;

COMMIT;

-- Migration: 105_update_invites_schema.sql
-- Adiciona suporte a telefone na tabela invites

BEGIN;

-- Adiciona coluna invited_phone
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS invited_phone text;

-- Torna invited_email nulo (mas mantém a coluna)
ALTER TABLE public.invites ALTER COLUMN invited_email DROP NOT NULL;

-- Adiciona check constraint para garantir pelo menos um dos dois
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invites_contact_check'
  ) THEN
    ALTER TABLE public.invites ADD CONSTRAINT invites_contact_check 
    CHECK (invited_email IS NOT NULL OR invited_phone IS NOT NULL);
  END IF;
END$$;

-- Criar índice para invited_phone
CREATE INDEX IF NOT EXISTS idx_invites_invited_phone ON public.invites(invited_phone);

COMMIT;

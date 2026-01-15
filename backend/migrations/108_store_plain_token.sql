-- Migration: 108_store_plain_token.sql
-- Adiciona a coluna 'token' para permitir recuperar o link do convite posteriormente.
-- Note que tokens antigos permanecerão nulos e não poderão ser copiados.

BEGIN;

ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS token text;

COMMIT;

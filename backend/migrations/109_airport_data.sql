-- Migration: 109_airport_data.sql
-- Adiciona colunas para dados detalhados de aeroportos e cria tabela de staging.

BEGIN;

-- 1. Atualizar tabela airports
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'BR';
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS elevation_ft int;
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS type text; -- small_airport, large_airport, heliport, closed
ALTER TABLE public.airports ADD COLUMN IF NOT EXISTS source_data jsonb; -- Metadados da fonte (url, license, updated_at)

CREATE INDEX IF NOT EXISTS idx_airports_country ON public.airports(country_code);
CREATE INDEX IF NOT EXISTS idx_airports_city ON public.airports(city);

-- 2. Tabela de Staging (Temporária para carga)
CREATE TABLE IF NOT EXISTS public.staging_airports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name text NOT NULL, -- 'ANAC_PUBLIC', 'ANAC_PRIVATE', 'OURAIRPORTS'
    raw_data jsonb,
    processed boolean DEFAULT false,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- Permite insert apenas para service_role (não expor via API pública)
ALTER TABLE public.staging_airports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='staging_airports' AND policyname='no_public_access'
  ) THEN
    EXECUTE 'CREATE POLICY no_public_access ON public.staging_airports FOR ALL USING (false)';
  END IF;
END$$;

COMMIT;

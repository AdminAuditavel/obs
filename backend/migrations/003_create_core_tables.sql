-- Migration: 003_create_core_tables.sql
-- Cria as tabelas principais do modelo (idempotente)
BEGIN;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- PostGIS (para geography) - pode exigir privilégios
CREATE EXTENSION IF NOT EXISTS postgis;

-- Reusa/define função set_updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Tabela: roles
CREATE TABLE IF NOT EXISTS public.roles (
  id text PRIMARY KEY
);
INSERT INTO public.roles (id)
VALUES ('admin'), ('moderator'), ('contributor'), ('registered')
ON CONFLICT DO NOTHING;

-- Schema Fix: user_profiles needs role_id for policies below
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN role_id text REFERENCES public.roles(id) DEFAULT 'registered';
        CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);
    END IF;
END$$;


-- Tabela: invites
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  invited_email text,
  role_id text REFERENCES public.roles(id),
  inviter_auth_uid uuid,
  max_uses int DEFAULT 1,
  uses_left int DEFAULT 1,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  used_by_auth_uid uuid,
  revoked boolean DEFAULT false,
  revoked_at timestamptz,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_invites_invited_email ON public.invites (invited_email);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON public.invites (expires_at);

-- Tabela: airports
CREATE TABLE IF NOT EXISTS public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icao text UNIQUE,
  iata text,
  name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airports_icao ON public.airports (icao);

-- Tabela: posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_auth_uid uuid NOT NULL,
  airport_id uuid REFERENCES public.airports(id),
  area text,
  category text,
  description text,
  server_timestamp timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'published',
  geolocation geography(Point,4326),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_airport_server_ts ON public.posts (airport_id, server_timestamp DESC);
-- índice espacial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='posts' AND indexname='idx_posts_geolocation'
  ) THEN
    EXECUTE 'CREATE INDEX idx_posts_geolocation ON public.posts USING GIST (geolocation)';
  END IF;
END$$;

-- Trigger de updated_at para posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_posts'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_set_updated_at_posts BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END$$;

-- Tabela: post_media
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  storage_path text,
  media_type text,
  thumbnail_path text,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media (post_id);

-- Tabela: comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  author_auth_uid uuid,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for comments updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_comments'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_set_updated_at_comments BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);

-- Tabela: post_reports
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_auth_uid uuid,
  reason text,
  comment text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports (post_id);

-- Tabela: post_confirmations
CREATE TABLE IF NOT EXISTS public.post_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  confirmer_auth_uid uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_confirmations_post_id ON public.post_confirmations (post_id);

-- Tabela: metar_taf_cache
CREATE TABLE IF NOT EXISTS public.metar_taf_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid REFERENCES public.airports(id),
  data jsonb,
  fetched_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_metar_taf_airport ON public.metar_taf_cache (airport_id);

-- Tabela: notams_cache
CREATE TABLE IF NOT EXISTS public.notams_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id uuid REFERENCES public.airports(id),
  data jsonb,
  fetched_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notams_airport ON public.notams_cache (airport_id);

-- Tabela: moderation_actions
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_auth_uid uuid,
  action text,
  target_type text,
  target_id uuid,
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON public.moderation_actions (target_type, target_id);

-- Tabela: audit_logs (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_auth_uid uuid,
  action text,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_auth_uid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Habilitar RLS e criar policies básicas (idempotente)
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_reports ENABLE ROW LEVEL SECURITY;

-- Policies para posts (public select, authenticated insert, update only owner or moderator/admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='public_select'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY public_select ON public.posts FOR SELECT USING (true);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='insert_authenticated'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY insert_authenticated ON public.posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='update_own_or_moderator'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY update_own_or_moderator ON public.posts FOR UPDATE
      USING (
        auth.uid() = author_auth_uid
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up WHERE up.auth_uid = auth.uid() AND up.role_id IN ('admin','moderator')
        )
      )
      WITH CHECK (
        auth.uid() = author_auth_uid
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up WHERE up.auth_uid = auth.uid() AND up.role_id IN ('admin','moderator')
        )
      );
    $pol$;
  END IF;
END$$;

-- Policies para invites (admin only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invites' AND policyname='admin_only_invites'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY admin_only_invites ON public.invites FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up WHERE up.auth_uid = auth.uid() AND up.role_id = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up WHERE up.auth_uid = auth.uid() AND up.role_id = 'admin'
        )
      );
    $pol$;
  END IF;
END$$;

-- moderation_actions & audit_logs: block client inserts (allow only service role / server)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='moderation_actions' AND policyname='no_client_inserts'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY no_client_inserts ON public.moderation_actions FOR INSERT WITH CHECK (false);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='no_client_inserts'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY no_client_inserts ON public.audit_logs FOR INSERT WITH CHECK (false);
    $pol$;
  END IF;
END$$;

-- post_reports: allow insert by authenticated users, allow select by moderator/admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_reports' AND policyname='insert_authenticated'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY insert_authenticated ON public.post_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_reports' AND policyname='select_mods_admins'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY select_mods_admins ON public.post_reports FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_uid = auth.uid() AND up.role_id IN ('admin','moderator'))
      );
    $pol$;
  END IF;
END$$;

COMMIT;

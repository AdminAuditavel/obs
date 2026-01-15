-- Migration: 001_create_user_profiles.sql

-- Extensão para gen_random_uuid()
create extension if not exists "pgcrypto";

-- Tabela user_profiles
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid unique,
  full_name text,
  callsign text,
  verified boolean not null default false,
  consent_privacy boolean not null default false,
  consent_privacy_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices recomendados
create index if not exists idx_user_profiles_auth_uid on public.user_profiles (auth_uid);
create index if not exists idx_user_profiles_created_at on public.user_profiles (created_at);

-- Trigger para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at on public.user_profiles;
create trigger trg_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- Habilita Row Level Security (RLS)
alter table public.user_profiles enable row level security;

-- Políticas RLS exemplo (ajuste conforme sua implementação de roles/claims)
drop policy if exists select_own_profile on public.user_profiles;
create policy select_own_profile on public.user_profiles
for select using (auth.uid() = auth_uid);

drop policy if exists insert_own_profile on public.user_profiles;
create policy insert_own_profile on public.user_profiles
for insert with check (auth.uid() = auth_uid);

drop policy if exists update_own_profile on public.user_profiles;
create policy update_own_profile on public.user_profiles
for update using (auth.uid() = auth_uid) with check (auth.uid() = auth_uid);

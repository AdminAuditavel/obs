# Checklist Final e Completo — MVP Observer (Supabase + Edge Functions)

Versão: 2026-01-11  
Propósito: checklist único, completo e executável para implementar o MVP com foco em fácil evolução sem retrabalho. Inclui melhorias práticas (segurança, privacidade, audit, UX) já incorporadas nos itens. Transforme cada linha em uma issue (ou subtask) no backlog.

Sumário rápido
- Arquitetura alvo: Supabase (Auth, Postgres, Storage) + Edge Functions (TypeScript) + Mobile (React Native / export AI Studio).  
- Prioridade: segurança, contrato (OpenAPI), migrations, RLS, Edge Functions para lógica sensível, testes críticos, CI/CD, observability, políticas de privacidade (LGPD).  
- Objetivo final: MVP que funciona, é seguro por padrão e pode evoluir sem retrabalho extenso.

Índice
1. Assunções e objetivos
2. Pré-requisitos & contas
3. Estrutura do repositório
4. Artefatos obrigatórios (entregáveis)
5. Migrations & esquema de dados (itens detalhados)
6. API‑first: OpenAPI / contrato
7. RLS & policies de segurança
8. Edge Functions (lista, responsabilidades e critérios)
9. Storage / uploads / EXIF / privacidade (LGPD)
10. Mobile integration (supabase-js + offline)
11. Moderation, audit_logs e conformidade
12. CI/CD, testes e qualidade
13. Observability, monitoramento e alertas
14. Jobs/background (METAR/NOTAM, thumbnails)
15. UX safety & microcopy (confirmations, undo, toasts)
16. Testes e critérios de aceitação (QA)
17. Rollout / staging / rollback
18. Evitar lock‑in e facilitar evolução
19. Tarefas sugeridas e estimativas
20. Artefatos que posso gerar imediatamente

---

1) Assunções e objetivos
- Supabase escolhido por acelerar MVP (Auth, DB, Storage) e permitir evolução.  
- MVP deve suportar: invites (single‑use/expiring), onboarding/consentimento, feed (official + collaborative), create post (foto obrigatória), post detail (comment/report/confirm), admin (invites + reports).  
- Priorizar segurança por padrão, auditabilidade e testes para evitar retrabalho.

---

2) Pré‑requisitos & contas
- [ ] Conta Supabase criada (guarde PROJECT_REF)
- [ ] Repositório GitHub (privado) + GitHub Actions
- [ ] Conta SendGrid (ou similar) para envio de convites
- [ ] Supabase CLI instalado localmente
- [ ] Variáveis/Secrets configuradas no GitHub:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY (server only)
  - INVITE_SECRET
  - SENDGRID_KEY
  - SENTRY_DSN (opcional)
  - NODE_ENV

---

3) Estrutura do repositório recomendada
- backend/
  - functions/
    - generateInvite/
    - acceptInvite/
    - createPost/
    - moderationActions/
    - presignUpload/ (opcional)
  - migrations/
  - package.json
  - README.md
- mobile/ (export AI Studio / RN)
- infra/ (opcional: terraform)
- docs/
  - openapi.yaml
  - mock-jsons/
- .github/workflows/
  - ci.yml
  - deploy-functions.yml

---

4) Artefatos obrigatórios (entregáveis)
- [ ] docs/openapi.yaml (API contract)
- [ ] backend/migrations (SQL) — run on staging
- [ ] RLS policies (SQL) — documented & applied
- [ ] Edge Functions (TS): generateInvite, acceptInvite, createPost, moderationActions
- [ ] Supabase storage `post-media` configured (privado)
- [ ] Mobile integrated with supabase-js for auth & upload
- [ ] CI workflows + deploy scripts
- [ ] Unit & integration tests for critical flows
- [ ] Sentry / logging / audit_logs configured

---

5) Migrations & esquema de dados — itens detalhados
Crie migrations versionadas (executar com supabase CLI / SQL editor).

Tabelas mínimas — criar e validar:
- user_profiles
  - id uuid pk default gen_random_uuid()
  - auth_uid uuid unique
  - full_name text
  - callsign text
  - verified boolean default false
  - consent_privacy boolean default false
  - consent_privacy_at timestamptz
  - created_at timestamptz default now()
  - updated_at timestamptz
- roles
  - id text pk (admin, moderator, contributor, registered)
- invites
  - id uuid pk default gen_random_uuid()
  - token_hash text not null
  - invited_email text
  - role_id text references roles(id)
  - inviter_auth_uid uuid
  - max_uses int default 1
  - uses_left int default 1
  - expires_at timestamptz
  - created_at timestamptz default now()
  - used_at timestamptz
  - used_by_auth_uid uuid
  - revoked boolean default false
  - revoked_at timestamptz
  - metadata jsonb
- airports
  - id uuid pk, icao text unique, iata text, name text, latitude double, longitude double, created_at
- posts
  - id uuid pk
  - author_auth_uid uuid not null
  - airport_id uuid references airports(id)
  - area text
  - category text
  - description text
  - server_timestamp timestamptz not null default now()
  - status text default 'published' -- ('published','pending','removed')
  - geolocation geography(point,4326) nullable
  - created_at timestamptz default now()
  - updated_at timestamptz
- post_media
  - id uuid pk, post_id uuid references posts(id), storage_path text, media_type text, thumbnail_path text, uploaded_at timestamptz
- comments
  - id uuid pk, post_id uuid references posts(id), author_auth_uid uuid, content text, created_at timestamptz
- post_reports
  - id uuid pk, post_id uuid, reporter_auth_uid uuid, reason text, comment text, status text default 'open', created_at timestamptz
- post_confirmations
  - id uuid pk, post_id uuid, confirmer_auth_uid uuid, created_at timestamptz
- metar_taf_cache, notams_cache (parsed jsonb, fetched_at, expires_at)
- moderation_actions
  - id uuid pk, moderator_auth_uid uuid, action text, target_type text, target_id uuid, reason text, metadata jsonb, created_at
- audit_logs (append-only)
  - id bigserial pk, actor_auth_uid uuid, action text, target_type text, target_id uuid, metadata jsonb, created_at timestamptz default now()

Notas importantes:
- Armazenar somente token_hash para invites (HMAC). Nunca salvar raw token.
- Use timestamptz e server_timestamp sempre server-side.
- Considere index em (airport_id, server_timestamp DESC) e em geolocation para queries por distância.

---

6) API‑first: OpenAPI / contrato
- [ ] Criar docs/openapi.yaml cobrindo endpoints:
  - GET /airports/{id}/feed
  - GET /airports/{id}/official
  - GET /posts/{id}
  - POST /posts
  - POST /uploads/presign (opcional)
  - POST /invites (admin)
  - POST /invites/accept
  - POST /posts/{id}/report
  - POST /moderation/actions
  - POST /auth/login (if needed)
- Benefícios:
  - frontend e mobile usam contrato comum
  - gera stubs e tests automáticos
  - reduz mudanças breaking no futuro

---

7) RLS & policies de segurança (essencial, aplicar já)
- Habilitar RLS em tabelas sensíveis (posts, invites, moderation_actions, audit_logs) e criar policies:

Exemplos (SQL) — ajuste conforme sua coluna de role/claims:

- posts SELECT pública (para feed)
```sql
-- permitir seleção a todos
create policy "public_select" on posts
for select using (true);
```

- posts INSERT apenas autenticado
```sql
create policy "insert_authenticated" on posts
for insert with check (auth.uid() is not null);
```

- posts UPDATE/DELETE apenas author ou moderator/admin
```sql
create policy "update_own_or_moderator" on posts
for update using (auth.uid() = author_auth_uid OR exists (select 1 from user_profiles where auth_uid = auth.uid() and role = 'moderator'));
```

- invites: only admin (via function)
- moderation_actions & audit_logs: INSERT only with service_role or functions

Checklist RLS:
- [ ] Habilitar RLS nas tabelas sensíveis
- [ ] Criar & testar policies com JWTs de teste (user, moderator, admin)
- [ ] Documentar policies no repo

---

8) Edge Functions — lista, responsabilidades e critérios de aceitação
Implemente em TypeScript dentro de backend/functions. Cada função deve gravar audit_log ao executar ação sensível.

A) generateInvite (admin only)
- Input: invited_email, role_id, expires_in_days, max_uses
- Output: invite_link (optionally raw token for admin UI)
- Segurança: require admin (check role in JWT)
- Audit: registrar invite criado

B) acceptInvite (public)
- Input: token, name, password (email optional)
- Steps:
  - compute token_hash = HMAC(INVITE_SECRET, token)
  - find invite WITH SELECT FOR UPDATE, validate uses_left>0, !revoked, not expired
  - decrement uses_left, set used_at, used_by_auth_uid
  - create user via Supabase Admin API (createUser) and create user_profile
- Atomicidade: operação dentro de transação para prevenir race
- Output: session/jwt (if created) or success message
- Audit: registrar accept

C) createPost (auth required)
- Input: airport_id, area, category, description, media[] (storage_path), geolocation
- Rules: require at least one media entry; set server_timestamp = now() server-side
- Inserts: posts + post_media
- Output: {id, server_timestamp}
- Audit: insert audit_log

D) moderationActions (moderator/admin)
- Input: action, target_type, target_id, reason
- Effects: soft delete posts via status='removed', create moderation_actions + audit_logs

E) presignUpload (optional if S3)
- Return signed PUT URL + storage_key

Cross-cutting:
- Request logging, error handling, Sentry
- Rate limiting basic (per IP per minute) to avoid abuse (optional quick rule)
- Use SUPABASE_SERVICE_ROLE_KEY only in functions

---

9) Storage / Uploads / EXIF / Privacidade (LGPD)
- [ ] Bucket `post-media` privado
- Upload flows (choose one):
  - A — Supabase Storage direct from client (recommended): mobile uses supabase-js authenticated upload; server verifies post metadata on createPost.
  - B — Presign flow for S3: presignUpload then client PUT; use Edge Function to return signed URL (optional).
- [ ] Default: strip EXIF metadata (privacity)
  - Implementação: strip EXIF server-side via `sharp` or client-side before upload
  - UI: toggle “Incluir EXIF (opcional)” — gravar consent flag only if true
- [ ] Use signed URLs for public display (short expiry)
  - Example supabase-js:
```js
const { data } = await supabase.storage.from('post-media').createSignedUrl(key, 300);
```
- [ ] Validate file types & sizes; generate thumbnails asynchronously
- [ ] Virus/scan optional via async job if budget permits

---

10) Mobile integration (supabase-js + offline)
- Auth:
  - Integrar signUp/signIn flows (or acceptInvite -> login)
- Upload:
  - `supabase.storage.from('post-media').upload(key, file)` (authenticated)
  - Get signed/public URL for display
- Create post:
  - After upload, call Edge Function createPost (or POST /posts) with storage paths
- Offline:
  - Implement local queue (AsyncStorage) for pending posts
  - Worker to retry on connectivity restored
  - UI shows badge "Pendente" and retry status
- UX rules:
  - Photo mandatory for POST
  - Submit disabled until photo + aerodrome provided
  - Toasts + undo for destructive actions

---

11) Moderation, audit_logs & conformidade
- [ ] post_reports table + admin queue UI
- [ ] moderation_actions table storing: moderator_id, action, target, reason, metadata
- [ ] audit_logs append-only (invite create/accept, confirm official data, remove post, revoke invite)
- [ ] All destructive actions require modal confirm + reason and produce audit log
- [ ] Soft delete posts (status='removed'), with process for permanent deletion (retention policy + legal requests)
- [ ] Endpoint/process for content removal requests (LGPD takedown)

---

12) CI/CD, testes e qualidade
- CI (PRs):
  - [ ] lint, build functions (tsc), unit tests, run migrations validation
- Deploy:
  - [ ] GitHub Actions workflow to deploy Edge Functions (`supabase functions deploy`) and run migrations
- Tests:
  - Unit: invite token gen & HMAC, createPost timestamp
  - Integration: acceptInvite concurrency test (race)
  - E2E: full flow (invite -> accept -> create post -> feed -> report -> moderation)
- Add tests to CI and fail PRs if critical tests fail

---

13) Observability & monitoramento
- [ ] Integrar Sentry (errors) nas Edge Functions
- [ ] Structured logs (request_id, user_id, function, duration)
- [ ] Basic metrics: function error rate, latency, upload failures, moderation queue length
- [ ] Alerts: error rate > threshold, job failures, repeated moderation removals

---

14) Jobs / background tasks
- METAR/NOTAM fetcher:
  - [ ] Scheduled job (every 5 min METAR / periodic NOTAM)
  - [ ] Parse & persist to metar_taf_cache / notams_cache with expires_at
- Media processing:
  - [ ] Thumbnail generator (async queue)
  - [ ] Optional: image optimization & EXIF stripping if not done client-side
- Retry jobs: implement retry/backoff for transient failures

---

15) UX safety & microcopy (aplicados no MVP)
- Confirm modals + undo:
  - Revogar convite, Remover post → modal com reason + Confirm
  - Provide undo toast after action (5–15s)
- Buttons & labels (PT‑BR):
  - "Gerar convite", "Revogar convite", "Criar conta e aceitar convite", "Começar", "Criar observação", "Enviar", "Reportar", "Confirmar dados oficiais", "Remover post"
- Disabled states & tooltips:
  - Confirm button disabled for non-verified users with tooltip: "Apenas usuários verificados podem confirmar."
- Accessibility:
  - Buttons >= 44px, contrast >= 4.5:1, alt text on images

---

16) Testes / critérios de aceitação (QA)
- Auth & invites:
  - [ ] Admin gera invite; invitee aceita e cria conta; invite single‑use; expiration works
- Create post:
  - [ ] Authenticated user uploads photo, createPost stores server_timestamp server-side
  - [ ] Post appears in feed
- Moderation:
  - [ ] Report creates post_report; admin can remove post; moderation_actions & audit_logs recorded
- Privacy:
  - [ ] EXIF removed by default (verify by downloading and inspecting)
  - [ ] Consent flag recorded
- Offline:
  - [ ] Create post offline saved as pending and syncs on reconnect
- Security:
  - [ ] service_role_key not in client
  - [ ] token_hash stored, not raw token
- Performance:
  - [ ] Feed query < 500ms for staging dataset

---

17) Rollout / staging / rollback
- Staging first: run migrations, deploy functions, test flows with staging accounts
- Beta: limited users, monitor metrics & errors
- Rollback plan:
  - [ ] rollback functions by deploying previous version
  - [ ] DB rollback via migration reversal (test before)
  - [ ] Hotfix: block endpoints via RLS or maintenance flag if needed

---

18) Evitar vendor lock‑in & facilitar evolução
- Abstrações:
  - [ ] Implement StorageAdapter interface (supabase implementation now, S3 later)
  - [ ] Keep business logic in Edge Functions, not embedded in client
- API versioning:
  - [ ] Namespace endpoints with /v1/ and plan v2
- IaC:
  - [ ] Keep terraform / infra scripts so infra can be recreated elsewhere
- Tests & contract:
  - [ ] OpenAPI + tests to guarantee swapability

---

19) Tarefas sugeridas e estimativas (orientativas)
- Migrations + RLS: 1–2 dias (1 backend)
- OpenAPI: 0.5–1 dia (1 backend)
- Edge Functions (3): 3–5 dias (2 backend)
- Mobile integration (auth + upload + offline queue): 3–5 dias (1 mobile)
- CI/CD & tests: 2–3 dias (devops + QA)
- METAR/NOTAM fetcher + thumbnails: 1–2 dias
- QA & staging: 2–4 dias

---

20) Artefatos que eu posso gerar imediatamente
- [ ] Migrations SQL completas (ready-to-run)  
- [ ] OpenAPI YAML (docs/openapi.yaml) com schemas e examples  
- [ ] Edge Functions TypeScript (generateInvite, acceptInvite, createPost, moderationActions) — esboço pronto para deploy  
- [ ] RLS policies SQL prontas para colar  
- [ ] GitHub Actions (ci.yml, deploy-functions.yml) templates  
- [ ] React Native snippet (supabase-js) para upload + createPost + offline queue  
- [ ] Test scripts (Jest + Supertest) para invite race condition & createPost flow  
- [ ] README de deploy passo-a-passo (supabase CLI + deploy)  

Diga qual artefato quer que eu gere primeiro (recomendação: Migrations SQL + OpenAPI) e eu gero imediatamente.

---

Anexo — Snippets úteis (copiar/colar)

HMAC token generation (Node.js)
```js
const crypto = require('crypto');
function makeInviteToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHmac('sha256', process.env.INVITE_SECRET).update(token).digest('hex');
  return { token, tokenHash };
}
```

Strip EXIF (Node + sharp)
```js
const sharp = require('sharp');
async function stripExif(buffer) {
  return await sharp(buffer).withMetadata({ exif: undefined }).toBuffer();
}
```

Create signed URL (Supabase JS)
```js
const { data } = await supabase
  .storage
  .from('post-media')
  .createSignedUrl('path/to/key.jpg', 300); // expires in 300s
```

RLS policy example (posts INSERT only authenticated)
```sql
alter table posts enable row level security;

create policy "posts_insert_authenticated" on posts
for insert
with check (auth.role() is not null); -- or auth.uid() is not null
```

---

Se concorda com este checklist final, eu começo gerando (marque um):
- [ ] Migrations SQL completas  
- [ ] OpenAPI YAML  
- [ ] Edge Functions TypeScript (3 principais)  

Indique qual artefato quer primeiro e eu providencio imediatamente.  

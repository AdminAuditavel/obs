# Observer — MVP Detalhado

Versão: 2026-01-11  
Objetivo: definir o escopo mínimo viável (MVP) para lançar um produto funcional e testável com usuários convidados (pilotos, OEAs, PMETs) que permita postar evidências visuais com timestamp confiável e consumir informações oficiais (METAR/NOTAM).

---

## 1. Objetivo do MVP
Entregar um produto mínimo que permita:
- Convidar colaboradores (single‑use invites, iniciados por admins).
- Criar contas por convite e login básico.
- Postar fotos contextuais por aeródromo (foto obrigatória + metadados mínimos) com timestamp do servidor.
- Consumir METAR/TAF e NOTAM via integração (cache).
- Ler posts, comentar e favoritar.
- Moderar/reportar posts básicos e ver histórico de auditoria.

Meta: validar utilidade operacional junto a 20–100 usuários convidados em 6–10 semanas de desenvolvimento.

---

## 2. Escopo (o que está dentro / fora)

Incluído no MVP:
- Auth: invite accept (single‑use) + email/password + email verification.
- Roles básicas: admin, contributor, registered.
- Invite flow: gerar, enviar e aceitar invite (single‑use, expiração 7 dias).
- Criação de post: foto obrigatória, seleção de aeródromo e área, categoria, descrição curta.
- Upload de mídia com pre-signed S3 e processamento mínimo (thumbnail).
- Server timestamp obrigatório no momento do upload/aceitação do post.
- Feed global ordenado por recência + busca por aeródromo + favoritar.
- Visualização de post (imagem em destaque, meta: server_timestamp, autor, aeródromo, área, categoria).
- Comments e favorites.
- Reports básicos (usuários reportam; admin revê).
- Cache METAR/TAF e NOTAM (uma fonte oficial primária).
- Painel administrativo mínimo: listar invites, revogar invites, moderar reports.
- Audit logs básicos: criação/aceitação de invite, criação/remoção de post, ações de moderação.
- Termos & disclaimer no cadastro; checkbox de consentimento (LGPD).
- Retenção e políticas básicas (prática de remoção manual).

Excluído do MVP (postergar):
- Mapas complexos e overlays de radar.
- Blur automático avançado por ML (sugestão manual apenas).
- Sistema de reputação / confirmações ponderadas.
- Verificação automatizada extensiva (somente fluxo manual de review).
- Gamificação e API pública.
- ML detection para classificação automática.

---

## 3. Personas e fluxos primários

Personas:
- Pilot (Piloto) — usa para checar rapidamente condição de pista/visibilidade.
- Contributor (OEA / PMET / SCI) — posta fotos do aeródromo.
- Admin — convida colaboradores e modera conteúdo.

Fluxos principais:
- Admin gera invite → convidado recebe e aceita → cria conta.
- Contributor cria post com foto → imagem enviada para S3 → servidor registra server_timestamp e cria post publicado (ou pending, se política).
- Registered user vê feed, abre post, comenta e favorita.
- Usuário reporta post → admin analisa e toma ação (remove/avisa).

---

## 4. User stories e critérios de aceitação (exemplos prioritários)

1) Como Admin quero gerar um convite single‑use para um colaborador para que ele possa criar conta.
- Critério: POST /admin/invites gera token, envia e‑mail, token expira em 7 dias e só pode ser usado 1 vez; criação registrada em audit_logs.

2) Como Convidado quero aceitar convite e criar conta para acessar detalhes dos posts.
- Critério: /join?token valida token, cria user com role do invite, marca invite como usado, grava log.

3) Como Contributor quero postar uma foto associada a um aeródromo para informar condição local.
- Critério: upload de imagem obrigatório; servidor grava server_timestamp; post aparece no feed global em <30s após upload; se sem foto, requisição rejeitada.

4) Como Registered user quero visualizar post em detalhe para avaliar evidência.
- Critério: ao abrir post mostra imagem em alta, servidor_timestamp, autor, aeródromo, categoria e botão report/favorite/comment.

5) Como Usuário quero reportar post para moderação.
- Critério: report cria entry em post_reports; admin vê fila e pode remover post; ação registrada em moderation_actions+audit_logs.

6) Como Sistema quero mostrar METAR/TAF e até 3 NOTAMs críticos no card oficial de cada aeródromo.
- Critério: background job fetcha METAR/NOTAM a cada 5 minutos; cache usado em consultas; card mostra fetched_at.

---

## 5. API — endpoints principais (resumo)

Autenticação / invites:
- POST /api/admin/invites  (auth: admin) — body: { invited_email, role, expires_in_days? } → 201 { invite_url }
- POST /api/invites/accept — body: { token, name, password } → 201 { user }
- POST /api/auth/login — body: { email, password } → 200 { access_token, refresh_token }

Posts & mídia:
- POST /api/uploads/presign — auth required — body: { filename, content_type } → 200 { upload_url, key, thumbnail_key? }
- POST /api/posts — auth required — body: { media_keys[], airport_id, area_id?, category_id, description? } → 201 { post }
- GET /api/airports/:id/feed — query: { limit, cursor } → 200 { posts[] }
- GET /api/posts/:id — 200 { post, media[], metadata }
- POST /api/posts/:id/report — auth required — body: { reason } → 201

METAR/NOTAM:
- GET /api/airports/:id/official — 200 { metar_taf_cache, notams_cache }

Admin / moderation:
- GET /api/admin/reports — auth: admin
- POST /api/admin/posts/:id/remove — auth: admin — body: { reason }

Profiles / interactions:
- POST /api/posts/:id/comment — body: { content }
- POST /api/posts/:id/favorite — toggles

Observações:
- Tokens e refresh devem ser JWT + refresh token hashed in DB.
- Pre-signed upload URLs for S3; server will verify post references media keys actually uploaded.

---

## 6. Esquema de dados mínimo (tabelas essenciais e campos)

Tabelas mínimas para MVP:

users
- id UUID, email, password_hash, full_name, created_at

roles
- id TEXT ('admin','contributor','registered')

user_roles
- user_id, role_id, granted_at

invites
- id UUID, token_hash, invited_email, role_id, inviter_id, expires_at, uses_left (1), created_at, used_at, used_by

airports
- id UUID, icao, iata, name, latitude, longitude, created_at

airport_areas
- id UUID, airport_id, code, name

observation_categories
- id UUID, key, label

posts
- id UUID, author_id, airport_id, area_id, category_id, description, server_timestamp, status ('published','pending','removed'), geolocation (nullable), created_at

post_media
- id UUID, post_id, storage_path, media_type, thumbnail_path, uploaded_at

post_reports
- id UUID, post_id, reporter_id, reason, status ('open','resolved'), created_at

metar_taf_cache
- id UUID, airport_id, raw_text, parsed JSONB, fetched_at, expires_at

notams_cache
- id UUID, airport_id, raw_text, parsed JSONB, fetched_at, expires_at

audit_logs
- id BIGSERIAL, actor_id, action, target_type, target_id, metadata JSONB, created_at

notifications (basic)
- id UUID, user_id, type, payload JSONB, read BOOLEAN, created_at

storage_files
- id UUID, path, url, size_bytes, content_type, uploaded_by, uploaded_at

user_settings
- user_id, favorites_airports[]

---

## 7. Regras e validações críticas

- Invite token: gerado aleatoriamente (32 bytes), enviado por e‑mail, armazenar apenas token_hash (HMAC-SHA256).
- Invite single‑use: DB transaction com SELECT FOR UPDATE e decrement de uses_left.
- Posts sem foto: rejeitar (HTTP 400).
- Server_timestamp: gerado no backend ao criar registro do post, não confiar em client_timestamp.
- EXIF: strip automático por padrão; manter metadados no servidor somente se autor consentir (campo no upload).
- Media access: pre-signed URLs expiram rapidamente; imagens servidas via CDN com URLs públicas ou via proxy com autorização, conforme escolha de privacidade.
- Reports: permitem ao admin remover post; remoção marca status='removed' (soft delete) e cria moderation_action.

---

## 8. UX / Telas chave (textual)

1. Tela inicial (sem login):
- Feed reduzido (thumbnails, titulo curto, selo origem).
- Botão "Entrar" / "Aceitar convite".
- Buscar aeródromo (text/voz).

2. Onboarding / Aceitar convite:
- Tela: "Aceitar convite" — mostra inviter, role, expira em X dias.
- Campos: nome, senha, checkbox LGPD.
- CTA: "Criar conta e aceitar convite".

3. Feed aeródromo:
- Header com aeródromo + botão favorito.
- Card 1: Resumo oficial (METAR/NOTAM) com selo "Oficial".
- Feed visual: posts por recência (avatar, minuthumbnail, recência, selo verificado se aplicável).
- Botão criação rápida: câmera.

4. Criar post:
- Camera full-screen (foto obrigatória) + opção de upload de galeria.
- Form: selecionar aeródromo (auto-complete por proximidade), área, categoria, descrição curta.
- Aviso: "Foto obrigatória. Server timestamp será aplicado."

5. Visualizar post:
- Foto em tela cheia, abaixo meta: autor (callsign), server_timestamp (UTC), aeródromo/área, botão report/comment/favorite.

6. Admin Panel (web):
- Lista invites, criar invite, revogar.
- Fila de reports, ação remover/reinstate.

---

## 9. Infraestrutura mínima e stack sugerido

- Mobile: React Native (Expo para acelerar).
- Backend: Node.js + Express / NestJS (ou Django) + PostgreSQL (+ PostGIS se usar geospatial).
- Storage: AWS S3 (pre-signed upload) + CloudFront CDN.
- Background jobs: Redis + Bull (process thumbnails, fetch METAR/NOTAM).
- Monitoring: Sentry + Prometheus/Grafana.
- CI/CD: GitHub Actions.
- Secrets: Vault/Secrets Manager.
- Deploy: Kubernetes (EKS/GKE) ou managed (Heroku/Render) para MVP pequeno.

---

## 10. Cronograma e marcos (estimativa para equipe mínima)

Premissas: 2 backend devs, 2 mobile devs, 1 frontend/admin, 1 QA, 1 devops, 1 PM.

Sprint 0 (1 semana)
- Setup repo, infra básica, DB, S3, CI, definição stories.

Sprint 1 (2 semanas)
- Auth + invite flow backend + endpoints accept invite.
- Mobile: onboarding / accept invite screen.
- Basic admin UI to create invite.

Sprint 2 (2 semanas)
- Upload flow (presign), post creation backend + DB.
- Mobile: camera/post creation flow.
- Thumbnail processing job.

Sprint 3 (2 semanas)
- Feed, post view, comments, favorites.
- Admin moderation endpoints and basic UI.
- METAR/NOTAM fetch job + cache + airport card.

Sprint 4 (2 semanas)
- Reports flow, audit logs, notifications minimal.
- Polish UX, validations, QA fixes.

Total estimado: 7–9 semanas (varia conforme equipe).

---

## 11. Testes e critérios de qualidade

Testes automatizados:
- Unit tests para invite single‑use logic e token hashing.
- Integration tests: accept invite → create account; upload presign → create post.
- E2E: fluxo completo convidado → postar → visualizar → report → moderação.

Testes manuais:
- Usabilidade com 8–12 usuários pilotos/operadores.
- Cenários offline (upload pendente), cobrança de UX.

Segurança:
- Pen‑test básico em endpoints de auth/invite.
- Verificação de S3 buckets não públicos; pre-signed URLs.

---

## 12. Métricas do MVP (monitorar desde o início)

- Conversão de invites: % de tokens aceitos dentro de 7 dias.
- Nº de posts/dia por aeródromo.
- Tempo médio entre timestamp real e postagem (objetivo: <30 min).
- Nº de reports por 100 posts.
- Latência média do card METAR/NOTAM (fetch → cache).
- Crash rate mobile, erros 5xx backend.

---

## 13. Riscos do MVP e mitigação rápida

Risco: baixa aceitação inicial
- Mitigação: selecionar pilotos/operadores influentes para beta; suporte próximo.

Risco: uploads indevidos / dados sensíveis
- Mitigação: strip EXIF por padrão; consentimento; botão de takedown manual via admin.

Risco: token leak / brute force
- Mitigação: token hashing HMAC + rate limit / expiração curta.

Risco: dependência de API oficial indisponível
- Mitigação: cache com expires_at e fallback; monitorar fetch failures.

---

## 14. Entregáveis do MVP

- Repositório com backend e mobile app (branches MVP).
- Infra básica pronta (DB, S3, jobs).
- Documentação de endpoints (README / OpenAPI básico).
- Migration SQL para tabelas mínimas.
- Admin panel básico para invites/moderação.
- Plano de testes e sessão de validação com usuários convidados.

---

## 15. Próximos passos imediatos (ação recomendada)

1. Aprovar este documento e priorizar backlog de stories por sprint.
2. Preparar protótipo interativo (Figma) com telas: accept invite, feed, criar post, post view, admin invites/moderation.
3. Gerar migrations SQL das tabelas mínimas (posso gerar).
4. Iniciar Sprint 0: infra + auth/invite endpoint + mobile onboarding.

Quer que eu gere agora:
- Migrations SQL para as tabelas mínimas do MVP, ou
- OpenAPI (YAML/JSON) com os endpoints listados, ou
- Protótipo Figma textual (wireframe detalhado para cada tela)?

Escolha um e eu preparo imediatamente.  

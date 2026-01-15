# Observer — Documento de Visão Detalhada e Roadmap de Implantação

Data: 2026-01-11  
Autor: Equipe de produto (rascunho gerado por assistente)

---

## 1. Visão Geral do Produto

Observer é um aplicativo mobile‑first para profissionais aeronáuticos (pilotos, OEAs, PMETs, SCI, operações de solo e administração de aeródromos) que fornece consciência situacional quase em tempo real com base em evidências visuais colaborativas. O objetivo é complementar, nunca substituir, as fontes oficiais (METAR/TAF, NOTAM, ATIS). O diferencial é mostrar "como o aeródromo está agora" por meio de fotos com timestamp servidor e contexto operacional.

Princípios centrais:
- Visual e colaborativo (foto obrigatória para postagem).
- Timestamp confiável (gerado no servidor).
- Separação clara entre conteúdo oficial e colaborativo.
- Controle de contribuintes via convites single‑use.
- Recência sobre histórico; confirmabilidade por perfil verificado.

---

## 2. Problema e Público‑Alvo

Problema:
- Informações críticas muitas vezes não aparecem em METAR/NOTAM ou estão desatualizadas.
- Informações locais (alagamentos, obras, animais, visibilidade pontual, fumaça) circulam de forma fragmentada e não confiável (WhatsApp, rádio).

Público‑alvo inicial:
- Pilotos (comandantes e co‑pilotos)
- OEAs (Operadores de Estação de Aeródromo)
- PMETs (Meteorologia operacional)
- SCI / Operações de Solo
- Administração de aeródromos e pessoal embarcado no aeródromo (porteiros, fiscalização)

Benefício central:
- Aumentar a consciência situacional com evidências visuais verificáveis e contextualizadas.

---

## 3. Proposta de Valor e Principais Funcionalidades

Funcionalidades essenciais (MVP):
- Feed global ordenado por recência com filtro por aeródromo.
- Postagem colaborativa: foto obrigatória + aeródromo + área (RWY, TWY, pátio...) + categoria + descrição curta + timestamp servidor.
- Convites single‑use: início controlado por admins; depois verificados podem convidar com quota.
- Visualização de posts: imagem em tela cheia, EXIF básico (quando consentido), hora do servidor, comentar, favoritar.
- Consulta rápida de METAR/TAF e NOTAM (integração com APIs oficiais, cache local).
- Linha do tempo combinada (oficial + colaborativo).
- Perfis verificados com selo; confirmação de observações por usuários verificados.
- Mecanismos de moderação e report.
- Disclaimers claros e LGPD: consentimento no onboarding e na postagem.

Funcionalidades desejáveis pós‑MVP:
- Mapas com posts geolocalizados e overlay de radar/tempo.
- Indicador de confiança (score) por post.
- Blur automático de faces/placas e opção de censura antes do upload.
- Badges, reputação profissional e histórico de confirmações.
- Notificações seletivas por aeródromo favoritado.

---

## 4. Requisitos Não‑Funcionais e Segurança

Privacidade & LGPD:
- Consentimento explícito para upload/exposição.
- Remoção/“direito ao esquecimento” com processo auditável.
- EXIF: strip por padrão, mostrar somente se autor consentir.
- Retenção de logs e imagens com política definida.

Segurança:
- Convites tokenizados com hash HMAC e single‑use; expiração (7 dias padrão).
- Logs de auditoria append‑only para ações sensíveis.
- 2FA para admins e moderadores.
- Rate limiting, proteção contra brute‑force de tokens.
- HTTPS, HSTS, cookies seguros, proteção CSRF.

Operacional:
- Cache para METAR/NOTAM (metar_taf_cache, notams_cache) com expires_at e origem de fetch.
- Armazenamento de mídia em S3 (ou equivalente) com referência em DB.
- Monitoramento de jobs de fetch e processamento de mídia.

---

## 5. Modelo de Dados (resumo mínimo)

Principais entidades:
- users, user_profiles, roles, user_roles
- invites (token_hash, role_id, inviter_id, uses_left, expires_at)
- airports, airport_areas
- posts, post_media, media_metadata
- post_confirmations, comments, favorites, post_reports
- metar_taf_cache, notams_cache, fetch_events
- timeline_events, moderation_actions, audit_logs
- settings, storage_files, notifications

(O esquema completo deve seguir as tabelas e campos definidos previamente.)

---

## 6. Fluxos Operacionais Principais

Fluxo convite (single‑use):
1. Admin gera invite (token random + hash armazenado).
2. Envia link por e‑mail: /join?token=<TOKEN>.
3. Aceite: valida token, cria conta com role definido, marca invite como usado (transação ACID).
4. Notificação ao convidante e log em audit_logs.

Fluxo postagem:
1. Usuário verificado (contributor) tira foto no app (compressão + blur sugerido).
2. Upload background -> servidor registra server_timestamp.
3. Post aparece no feed global (recência), posts de novos colaboradores podem ficar em pending se política exigir.
4. Verificados podem "confirmar condição"; múltiplas confirmações aumentam confiança.

Fluxo moderação:
- Report → moderation_queue → ação (dismiss/revert/remove) → moderation_actions + audit_logs.

Integração oficial:
- Job periódicos buscam METAR/TAF e NOTAM; armazenam em metar_taf_cache / notams_cache.
- timeline_events agrega atualizações oficiais e colaborativas.

---

## 7. Roadmap de Implantação (fases, 6–9 meses estimados)

Premissas:
- Equipe mínima inicial: 1 PM/PO, 1 Tech Lead/Arquitetura, 2 backend, 2 mobile (React Native), 1 frontend/web, 1 QA, 1 DevOps/infra. Ajustar conforme recurso.
- Iterações semanais (sprints de 2 semanas).
- Foco em MVP que permita uso real por beta testers (pilotos e operadores convidados).

Fase 0 — Preparação (1–2 semanas)
- Artefatos: Documento de visão (este), priorização do backlog, definição de MVP, protótipos low‑fi (Figma).
- Setup inicial: repositório, CI/CD minimal, ambientes (dev/stage/prod), S3, DB Postgres + PostGIS opcional.
- Acordo legal: rascunho de termos de uso e política de privacidade (LGPD).

Entrega: protótipo navegável low‑fi, repositório inicial, infraestrutura básica.

Fase 1 — MVP Core (6–8 semanas)
- Backend:
  - Auth (email + password, invite accept flow), roles, invites single‑use.
  - API de posts, upload (pre‑signed S3), tratamento básico de mídia.
  - Cache METAR/NOTAM (integração inicial com 1 fonte).
  - Audit logs, moderation endpoints.
- Mobile (React Native):
  - Fluxo on‑boarding (aceitar convite).
  - Feed global (listagem por recência).
  - Post creation UI (foto, escolher aeródromo/área, categoria).
  - Visualização de post (imagem em destaque, meta).
- Infra/DevOps:
  - Storage (S3), background jobs (processing), monitoring/logging.
- QA:
  - Testes de fluxo convite, upload, publicação e moderação.

Entrega: MVP funcional para beta controlado (apenas convidados podem postar; usuários cadastrados leem/commentam).

Fase 2 — Beta Estendido e Confiança (6–8 semanas)
- Implementar verificação de perfis (manual/fluxo de requests).
- Selo verificado, confirmação de posts e contagem de confirmações.
- Filtragem do feed por favoritos, distância, verificados.
- Enhancements: blur automático de faces, EXIF handling por consentimento.
- Melhorias na integração METAR/NOTAM (multi‑fonte, parsing, criticality).
- Notificações por aeródromos favoritados.
- Políticas de moderação e painel admin.

Entrega: Beta com 50–200 usuários convidados, processo de verificação operacional.

Fase 3 — Estabilização e Escala Inicial (8–12 semanas)
- Mapas e overlays (posts geolocalizados, clusterização).
- Performance e segurança: rate limits, 2FA para admins, key rotation.
- Analytics e métricas (engajamento, tempo de validade de posts, confirmações).
- Polishing UX: onboarding, disclaimers, mensagens de erro.
- Preparação legal: política final, termos, GDPR/LGPD compliance review.

Entrega: Lançamento controlado (v1) para comunidade aérea interessada; comunicação às bases de usuários.

Fase 4 — Crescimento e Features Avançadas (contínuo)
- Integração avançada de radar/relâmpagos.
- Machine learning: detecção de objetos (obstáculos, água, fumaça) para sugerir categorias.
- API pública (read‑only) para parceiros com rate limiting.
- Programas de parcerias com aeródromos e órgãos reguladores.

---

## 8. Métricas de Sucesso (exemplos)

Métricas de produto:
- Taxa de adoção entre convidados: % que aceitaram convite dentro de 7 dias.
- Engajamento: posts por usuário ativo/mês.
- Tempo entre evento no solo e primeira postagem (média).
- % de posts confirmados por verificados.
- Taxa de reports por 1000 posts (indicador de ruído/mal uso).
- Latência média do fetch METAR/NOTAM e tempo de atualização no app.

Métricas operacionais:
- Uptime dos jobs de fetch.
- Tempo médio de processamento de mídia.
- Incidentes de segurança (0 desejável).

Métricas de confiança:
- Crescimento do número de usuários verificados.
- Proporção de posts que têm >=1 confirmação em X minutos.

---

## 9. Riscos e Mitigações

Risco: Conteúdo malicioso/troll
- Mitigação: convites controlados, single‑use, reports, moderação rápida, penalidades.

Risco: Responsabilidade jurídica por conteúdo operacional
- Mitigação: disclaimers claros, logs, termos de uso, orientação para PIC (comandante).

Risco: Exposição de dados sensíveis (faces, placas, áreas restritas)
- Mitigação: blur automático, stripping de EXIF, consentimento, opção de restricted posts.

Risco: Dependência de APIs oficiais
- Mitigação: cache robusto, múltiplas fontes quando possível, fallback e monitoramento.

Risco: Baixo engajamento inicial
- Mitigação: foco em nicho (pilotos/oeas), convites por influência, uso inicial real nos aeródromos parceiros.

---

## 10. Requisitos Legais/Compliance

- Termos de uso e política de privacidade (LGPD) com consentimento explícito no onboarding.
- Procedimento formal para requisições de remoção (takedown) e atendimento a direitos do titular de dados.
- Retenção mínima de logs para auditoria (configurar conforme legislação aplicável).
- Revisão jurídica antes de distribuir publicamente.

---

## 11. Arquitetura Técnica Recomendada (resumo)

- Frontend Mobile: React Native (Expo se quiser acelerar).
- Backend: Node.js (Express/Nest) ou Django; PostgreSQL + PostGIS.
- Storage: S3 (objetos) + CloudFront para CDN.
- Jobs: Redis + Bull/Sidekiq / Cloud Tasks para processamento de mídia, fetches e notificações.
- Autenticação: JWT com refresh tokens + email verification + invite token flow.
- Observability: Prometheus/Grafana, Sentry, logs centralizados.
- Deploy: IaC (Terraform), Kubernetes ou serverless (dependendo da escala e equipe).

---

## 12. Critérios de Aceitação do MVP

- Usuários convidados conseguem aceitar invite e criar conta.
- Contribuidores convidados conseguem postar foto com server_timestamp.
- Usuários registrados conseguem ver posts completos, comentar e favoritar.
- METAR/NOTAM aparece no card "Resumo oficial" com fetch e cache operacional.
- Convites são single‑use e expiráveis; aceitação é transacional.
- Logs de auditoria registram criação/aceitação de invites e ações de moderação.

---

## 13. Plano de Lançamento e Comunicação

1. Lançamento Beta fechado (início com ~20–50 profissionais locais).
2. Coleta de feedback estruturado: entrevistas, analytics, pesquisa NPS curta.
3. Ajustes de UX, bugs e melhorias de confiança.
4. Lançamento beta ampliado (até 200 users) e iniciar parcerias com aeródromos-chaves.
5. Comunicação formal ao público alvo (comunidades de pilotos, associações, fóruns técnicos).

---

## 14. Próximos Passos Imediatos (o que eu posso entregar agora)

1. Gerar documento de requisitos do MVP com user stories e acceptance criteria (pronto em 1–2 dias).
2. Gerar OpenAPI básico (endpoints auth, invites, posts, media, cache METAR/NOTAM).
3. Gerar migrations SQL iniciais (users, invites, posts, post_media, metar_taf_cache).
4. Criar wireframes de telas chave (onboarding, feed, criar post, post view, admin invites).
5. Escrever template jurídico (disclaimer e consentimento LGPD) para revisão por advogado.

Diga qual desses artefatos você quer primeiro que eu gere e eu começo na sequência. Também posso adaptar o roadmap para outro horizonte de tempo (3 meses acelerado, 12 meses com features robustas) se preferir.

--- 

Fim do documento.

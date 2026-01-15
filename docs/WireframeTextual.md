# Observer — Wireframe Textual (Mobile‑First, MVP)

Versão: 2026-01-11  
Objetivo: fornecer especificação textual detalhada das telas chave do MVP para implementação rápida no Figma / Draftbit / outra ferramenta de protótipo.

Observação: layouts pensados para viewport mobile 375×812 (iPhone X/11) como referência. Use Auto Layout responsivo.

---

## Sumário de telas (prioridade)
1. Splash / Launch
2. Aceitar Convite (Join)
3. Onboarding / Consentimento (LGPD + Disclaimer)
4. Home Aeródromo (Feed)
   - Resumo Oficial (card fixo)
   - Feed Visual (lista por recência)
5. Criar Post (Camera / Form)
6. Visualizar Post (Post Detail)
7. Perfil / Configurações (mínimo)
8. Admin — Criar Convite / Lista de Convites
9. Admin — Fila de Reports / Moderação
10. Estado Offline / Upload Pendente / Empty States

---

## Navegação e elementos globais

- Barra superior (Header)
  - Left: ícone "voltar" (quando aplicável)
  - Center: título (ex.: nome do aeródromo ou "Observer")
  - Right: ícone de busca / ícone de favoritar aeródromo / avatar do usuário
  - Altura: 56px
- Barra inferior (Bottom Nav) — visível nas telas principais
  - Ícones (esquerda→direita): Home (feed), Mapa (placeholder), Criar (central FAB opcional), Notificações, Perfil
  - Indicação de item ativo por cor e label
- Floating Action Button (FAB) central (opcional): câmera rápida → abre Criar Post
  - Cor: brand (ex.: azul escuro), ícone câmera branco
- Paleta semântica (sugestão)
  - Verde: normal/safe
  - Amarelo: atenção
  - Vermelho: crítico/alerta
  - Cinza: colaborativo / neutro
  - Botões principais: cor de destaque (brand)

Acessibilidade
- Texto mínimo 14px para corpo; títulos 16–18px; CTAs 16–18px pesos semibold.
- Contraste >= 4.5:1
- Labels de botão com aria-label equivalents para leitores de tela
- Todos os inputs com foco visível

---

## 1) Splash / Launch
Objetivo: carregamento rápido + logotipo + check de sessão.

- Elementos:
  - Logotipo central (Observer)
  - Subtexto: "Consciência situacional colaborativa"
  - Loader/spinner pequeno abaixo
- Comportamento:
  - Checar token válido → se sim navega para Home; se não, tela Welcome/Join.
  - Duração: 1.5–3s (ou até o resultado do check auth)

---

## 2) Aceitar Convite (Join)
Objetivo: aceitar token single‑use e criar conta.

- Header: "Aceitar Convite"
- Subheader: "Convidado por {InviterName} • Role: {role_label} • Expira em {X dias}"
- Campos:
  - Nome completo (text)
  - E‑mail (preenchido se presente no convite — bloqueado)
  - Senha (password, com requisito mínimo)
  - Checkbox: "Li e concordo com os Termos de Uso e Política de Privacidade" (link)
- CTA principal: "Criar conta e aceitar convite" (botão preenchido)
- CTA secundário: "Cancelar"
- Erros/validações:
  - Senha inválida → "Senha deve ter mínimo 8 caracteres."
  - Token inválido/expirado → modal: "Convite inválido ou expirado. Peça novo convite ao administrador."
- Ações de sucesso:
  - Cria conta, atribui role, marca invite usado, redireciona para Onboarding.

Microcopy exemplo:
- Placeholder senha: "Mínimo 8 caracteres"
- Mensagem de sucesso: "Bem‑vindo(a)! Conta criada com sucesso."

---

## 3) Onboarding / Consentimento (LGPD + Disclaimer)
Objetivo: explicitar natureza colaborativa e obter consentimento.

- Layout: 2–3 cards roláveis (swipe) com:
  1. "Como funciona" — breve: foto obrigatória, timestamp servidor, conteúdo colaborativo.
  2. "Limites" — aviso: não substitui METAR/NOTAM; julgamento final é do PIC.
  3. "Privacidade" — consentimento para uso de imagens, EXIF (opcional).
- Checkbox final obrigatório: "Autorizo o uso das imagens e concordo com a política."
- CTA: "Começar"
- Link: "Ler Termos completos"

Microcopy curto:
- Aviso em rodapé: "Conteúdo colaborativo — não oficial. Verifique fontes oficiais antes de operar."

---

## 4) Home Aeródromo (Feed) — Tela Principal do Aeródromo
Objetivo: mostrar Resumo Oficial + Feed Visual por recência.

- Header: Nome do aeródromo + ICAO/IATA + ícone favoritar.
- Último fetch: "Atualizado: 12:05 UTC" (pequeno)
- Bloco 1 — Resumo Oficial (card fixo, topo)
  - METAR/SPECI (linha única resumida)
  - Ícones rápidos: vento (seta + velocidade), visibilidade (km), fenômenos (BR, FG, CB, RA)
  - NOTAMs críticos listados (máx 3) com selo de criticidade
  - CTAs: "Marcar como lido" (persistente), "Detalhar" (abre modal com METAR completo + TAF + link fonte)
  - Selo grande: "Oficial" (canto)
- Bloco 2 — Feed Visual (lista vertical, recência desc)
  - Cada Card de Post (altura ~140–200px)
    - Thumbnail (left/top), meta pequeno: selo "Colaborativo"/"Verificado", avatar do autor (badge verificado), "há 2 min"
    - Título curto (ex.: "Pista com água na cabeceira 09"), aeródromo/área, descrição curta (1–2 linhas)
    - Botões: Curtir, Comentar (nº), Report, Confirmar (apenas verificados)
  - Ordenação: por recência; filtros rápidos: "Ver só verificados" / "Por distância" / "Favoritos"
  - Empty state: "Ainda não há observações recentes. Seja o primeiro a postar!"
- Bloco 3 — Linha do tempo compacta (colapsável)
  - Carrossel horizontal com eventos cronológicos do dia (METAR updates, NOTAM, posts)
  - Ícones por tipo (oficial vs colaborativo)
  - Scrubbing horizontal

Interações:
- Tap no card → abre Post Detail
- Swipe left on post (admin?) → ações rápidas (report/confirm)
- Long press thumbnail → abrir preview maior

---

## 5) Criar Post (Camera / Form)
Objetivo: fluxo rápido de captura e envio de evidência visual.

- Entry point: FAB câmera / botão "Criar post"
- Passo A: Camera screen (full screen)
  - Top: instruções curtíssimas: "Foto obrigatória — capture o que deseja reportar"
  - Bottom overlay: botão grande de disparo, mini‑preview da última foto, botão alternar câmeras, flash
  - Microcopy: "Mantenha distância segura. Não exponha dados sensíveis."
- Ao capturar → transita para Form de meta (bottom sheet)
- Form:
  - Aeródromo (auto‑sugestão por proximidade + busca) — obrig.
  - Área (select): RWY, TWY, Pátio, Cabeceira, Acesso
  - Categoria (select): Condição do aeródromo, Fenômeno meteorológico, Condição operacional
  - Descrição (opcional, 140 chars max)
  - Geotag: checkbox "Incluir geolocalização (recomendado)" (default: on if consent)
  - Botão: "Enviar" (ativa apenas com foto + aeródromo)
- Upload:
  - Pré‑assinatura S3 feita no background, upload em background thread.
  - Mostrar barra de progresso + snackbar: "Enviando…"
  - Após upload concluído: backend grava post com server_timestamp e retorna success.
  - Estado offline: salvar localmente, status "pendente" e enviar automaticamente quando online.
- Sucesso:
  - Modal: "Post publicado" com CTA "Ver no feed" e "Compartilhar link" (opcional)
- Erros:
  - Falha no upload: "Falha ao enviar. Tentar novamente / Salvar como pendente."

Regras:
- Sem foto → bloquear.
- EXIF: por padrão strip; permitir opção "incluir EXIF" no form (consentimento).

---

## 6) Visualizar Post (Post Detail)
Objetivo: exibir imagem grande e metadados confiáveis.

- Layout:
  - Imagem em tela cheia (suportar pinch to zoom)
  - Top overlay: autor (avatar, callsign), selo verificado, server_timestamp (ex.: "12:03 UTC"), distância/azimute (se geotag)
  - Body (abaixo imagem, scroll):
    - Aeródromo • Área
    - Categoria (badge)
    - Descrição completa
    - EXIF / Meta (botão "Ver EXIF" se disponível e consentido)
    - Ações: Confirmar (apenas verificados), Curtir (contador), Comentar (contador), Reportar
    - Timeline de confirmações: avatars de quem confirmou (máx 5)
- Comentários:
  - Campo de escrever com botão enviar
  - Threaded replies (opcional)
- Report flow:
  - Modal: selecionar razão (spam, incorreto, sensível, outro) + comentário opcional
  - Confirmação: "Seu report foi enviado"

Estados:
- Post removido → mostrar "Este post foi removido por moderação" + razão (se aplicável)
- Post pendente → badge "Pendente" + tempo desde upload

Microcopy:
- Botão Confirmar: "Confirmar condição (apenas verificados)"
- Aviso: "Este conteúdo é colaborativo. Consulte fontes oficiais antes de operar."

---

## 7) Perfil / Configurações (mínimo)
Objetivo: ajustes básicos do usuário.

- Perfil:
  - Avatar, nome, callsign, selo verificado (se aplicável), biografia curta
  - Botões: "Solicitar verificação" (abre form)
- Configurações:
  - Favoritos (aeródromos)
  - Notificações (on/off por aeródromo)
  - Segurança: alterar senha, 2FA (opcional)
  - Privacidade: gerenciar imagens/publicidade / solicitar remoção
  - Logout

---

## 8) Admin — Criar Convite / Lista de Convites
Objetivo: permitir admins gerar convites single‑use.

- Tela Create Invite:
  - Campos: e‑mail convidado, role (select: contributor/moderator), expiração (dias)
  - CTA: "Gerar convite" → mostra modal com link (copy button) + opção "Enviar por e‑mail" (auto)
  - Microcopy: "Link de uso único. Expira em 7 dias por padrão."
- Lista de Convites:
  - Tabela/Lista: invited_email, role, inviter, created_at, expires_at, used_at (se usado), status (active/used/revoked)
  - Ação rápida: revogar (botão) → confirmação modal "Revogar convite?"

Audit:
- Logar criação/revogação em audit_logs

---

## 9) Admin — Fila de Reports / Moderação
Objetivo: ver e agir em reports.

- Lista de Reports:
  - Item: post thumbnail, razão, reporter, created_at, post snippet
  - Ações: Visualizar post → ao abrir: [Remover post / Avisar autor / Dismiss report]
  - Ao remover: define post.status = 'removed', gera moderation_action e audit_log
- Filtros: por criticidade, por aeródromo, tempo

---

## 10) Estados Offline / Upload Pendente / Empty States
Estados importantes a especificar:

- Offline General:
  - Barra superior amarela: "Offline — suas ações serão sincronizadas quando voltar"
- Upload pendente:
  - Post card mostra badge "Pendente" com spinner
  - Tela Posts pendentes em Perfil → opção reenviar ou excluir
- Empty Feed:
  - "Sem observações recentes" + CTA "Registrar observação" (se autorizado)
- Erro METAR fetch:
  - Card oficial mostra "Não foi possível atualizar. Último fetch: {time}."

---

## Testes de Usabilidade / Tarefas para Beta Testers

1. Receber convite por e‑mail → abrir link → aceitar convite e criar conta.
2. Abrir aeródromo favorito → ver card METAR/NOTAM → confirmar que campo "Atualizado" aparece.
3. Criar post: tirar foto, preencher aeródromo e área, enviar → verificar se aparece no feed em <1 minuto.
4. Visualizar post → abrir EXIF (se consentido) → confirmar timestamp do servidor.
5. Comentar em post e favoritar.
6. Reportar um post e verificar (como admin) se o report aparece na fila.
7. Testar upload offline: tirar foto sem conexão → confirmar post fica "pendente" e sincroniza ao reconectar.
8. Admin: gerar convite single‑use e revogar antes de ser usado → aceitar convite com token revogado produzir mensagem de erro.

Colete métricas qualitativas:
- Tempo para completar cada tarefa
- Dificuldade percebida (1–5)
- Sugestões de melhoria textual

---

## Microcopy e textos padrões (português) — prontos para uso

- Botões:
  - "Criar conta e aceitar convite"
  - "Começar"
  - "Enviar"
  - "Reportar"
  - "Confirmar condição"
  - "Marcar como lido"
- Modais:
  - Convite inválido: "Convite inválido ou expirado. Solicite um novo convite ao administrador."
  - Remover post: "Tem certeza que deseja remover este post? Esta ação será registrada."
  - Upload falhou: "Falha ao enviar. Tentar novamente ou salvar como pendente."
- Avisos:
  - "Conteúdo colaborativo — não oficial. Consulte fontes oficiais (METAR/NOTAM) antes de operar."
  - Consentimento LGPD: "Autorizo o uso da imagem para fins de compartilhamento operacional conforme a Política de Privacidade."

---

## Entregáveis para importar no Figma / prototipador
- Para cada tela: nome do frame, tamanho 375×812, lista de componentes (header, card oficial, post card, FAB, bottom nav).
- Assets: ícones (vento, visibilidade, camera, mapa, star, flag/report), placeholders de fotos (usar fotos geradas por IA ou imagens de licença livre).
- Paleta de cores e tokens de tipografia.
- Fluxos clicáveis: Join → Onboarding → Feed → Criar Post → Post Detail; Admin: Login Admin → Create Invite → Invite List → Reports.

---

## Notas finais / Prioridades UX para protótipo
- Foco em velocidade: telas simples e iteráveis.
- Mostrar claramente a diferença entre “Oficial” (METAR/NOTAM) e “Colaborativo”.
- Minimize cliques para postar (camera → select aeródromo → enviar).
- Deixe disclaimers visíveis, mas não intrusivos.
- Garanta feedbacks rápidos (toasts/snackbars) para ações de upload/erro.

---

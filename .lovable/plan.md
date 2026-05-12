# Regras Senior — Evolução (gap em relação à nova spec)

## O que já está pronto (turno anterior)
- Rotas `/regras-senior`, `/regras-senior/regras`, `/regras-senior/regras/nova`, `/regras-senior/regras/:id`, `/regras-senior/identificadores`, `/regras-senior/auditoria`.
- Sidebar com grupo colapsável "Regras Senior".
- Dashboard com KPIs (regras totais, rascunho, revisão, aprovadas, identif. ativos/inativos/teste, últimas alterações) e banner de risco.
- Listagem de regras com filtros (texto, status, idereg), badges, ações (Ver / Editar / Exportar TXT / Alterar status).
- Formulário criar/editar com `fonte_lsp` em textarea monoespaçada, validação Zod, motivo obrigatório.
- Tela de identificadores com filtros (codemp, modsis, idereg, situacao, codreg, texto), badges A/I/X, ações de Alterar situação / Alterar regra vinculada, e botão **Gerar Snapshot**.
- Modais "Alterar situação" e "Alterar regra vinculada" com motivo obrigatório + checkbox de confirmação.
- Tela de auditoria com filtros (período, ação, usuário) — colunas básicas.
- Cliente da API reutiliza `src/lib/api.ts` (Bearer token, ngrok-skip, 401 → logout/login, base URL dinâmica via `app_settings.erp_api_url`).

## Gaps a implementar nesta iteração

### 1. Workflow estendido de status da regra
Atualizar `StatusRegra` para o ciclo completo:
```
RASCUNHO → EM_REVISAO → APROVADA → EXPORTADA →
COMPILADA_HOMOLOGACAO → TESTADA_HOMOLOGACAO →
PUBLICADA_PRODUCAO → ATIVA ⇄ INATIVA
```
- Atualizar `src/lib/senior/types.ts` e `StatusRegraBadge.tsx` com cores por etapa (rascunho cinza, revisão âmbar, aprovada azul, homologação roxo, produção verde, ativa verde-forte, inativa cinza-escuro).
- No formulário de regra, exibir botões contextuais conforme o status atual:
  - RASCUNHO → "Salvar rascunho" / "Enviar para revisão"
  - EM_REVISAO → "Aprovar" / "Reprovar"
  - APROVADA → "Exportar TXT"
  - EXPORTADA → "Marcar compilada (homolog.)"
  - COMPILADA_HOMOLOGACAO → "Marcar testada (homolog.)"
  - TESTADA_HOMOLOGACAO → "Publicar em produção"
  - PUBLICADA_PRODUCAO → "Ativar" / "Inativar"
- Cada transição chama `POST /api/senior/regras/:id/status` com `{novo_status, motivo}`. Motivo continua obrigatório.

### 2. Modal de aviso enriquecido (Alterar situação)
Refinar `AlterarSituacaoDialog` para exibir blocos:
```
Identificador: CHA-900SDPBC01
Empresa: 1 · Módulo: ESM
Situação atual: I  →  Nova situação: A
```
Com badge antes/depois lado a lado e mensagem destacada quando a transição cruza A↔I.

### 3. Tela de Auditoria detalhada
Estender colunas para o modelo `USU_AUD_IDENT_REGRA`:
- Data/hora, Usuário API, Ação, Empresa, Módulo, Identificador, **Regra anterior → Regra nova**, **Situação anterior → Situação nova**, Motivo, **Resultado** (sucesso/erro com badge).
- Filtros adicionais: empresa, módulo, identificador.
- Acionar a partir do botão "Ver log" da linha do identificador (já existe; passa filtro pré-preenchido via querystring).

### 4. Tela de Snapshots `/regras-senior/snapshots`
Nova rota dedicada. Lista snapshots gerados (`GET /api/senior/identificadores/snapshots`) com colunas: Data/hora, Usuário, Qtde registros, Ações (Visualizar / Comparar com atual / Download JSON).
Botão "Gerar snapshot" também disponível nesta tela. Botão da tela de Identificadores passa a navegar aqui após gerar.

### 5. Permissão de administrador para ações perigosas
- Centralizar verificação num hook `useIsSeniorAdmin()` baseado em `useUserPermissions` (ou em uma role específica `senior_admin`).
- Bloquear (`disabled` + tooltip "Somente administradores") os botões: Alterar situação, Alterar regra vinculada, transições de status APROVADA→PUBLICADA_PRODUCAO e Ativar/Inativar.
- Sidebar/rotas continuam visíveis para leitura; só ações são restritas.

### 6. Reorganizar sidebar sob "Administração"
Conforme spec: agrupar "Regras Senior" dentro de uma seção "Administração" (junto com itens já existentes como Configurações / Gestão SGU se fizer sentido) — ou manter como grupo próprio mas renomear o label superior. Sugestão: criar `adminSubItems` com Regras Senior + Configurações + Gestão SGU, removendo-os do bloco "Módulos".

### 7. Ajustes pequenos
- Botão "Validar riscos" no formulário da regra → chama `POST /api/senior/regras/:id/validar` (placeholder; mostra toast com lista de avisos retornada).
- Botão "Ver versões" no formulário → modal listando versões anteriores (`GET /api/senior/regras/:id/versoes`).
- Dashboard: adicionar cards "Exportadas" e "Alteradas hoje".

## Fora do escopo (próximas fases, conforme sua recomendação)
- Comparador visual de versões (diff lado a lado).
- Editor LSP avançado (Monaco).
- Rollback assistido.
- Biblioteca de modelos de regras.
- Fluxo de aprovação multi-usuário.

## Detalhes técnicos
- Todas as transições de status reusam `seniorApi.alterarStatusRegra` (já existe).
- Novos endpoints assumidos (a confirmar com seu FastAPI):
  - `GET /api/senior/regras/:id/versoes`
  - `POST /api/senior/regras/:id/validar`
  - `GET /api/senior/identificadores/snapshots`
  - `GET /api/senior/identificadores/snapshots/:id`
- Sem mudanças no Lovable Cloud (módulo é 100% cliente do FastAPI).
- Continuamos usando o `ApiClient` existente — não criar fetch paralelo.

## Perguntas
1. Confirma reorganizar a sidebar criando o grupo **"Administração"** englobando Regras Senior, Configurações e Gestão SGU? Ou prefere manter Regras Senior como grupo independente?
2. A role de "senior_admin" deve vir de uma permissão nova no Lovable Cloud (tabela `user_roles`) ou basta usar uma flag em `useUserPermissions`?
3. Os endpoints `versoes`, `validar` e `snapshots/listagem` já existem no seu FastAPI ou devo implementá-los como stubs (UI pronta, chamada com fallback para vazio)?

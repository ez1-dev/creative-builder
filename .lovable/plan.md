# Módulo "Regras Senior"

Cria um novo módulo administrativo no Sapiens Control Center para gerenciar **regras LSP** e **identificadores E098REG** do ERP Senior. Toda comunicação acontece via API FastAPI externa (mesma `VITE_ERP_API_URL` / `erp_api_url` em `app_settings` já usada no projeto — base URL configurável em runtime). Nenhuma conexão direta com SQL Server, nenhuma senha do ERP no frontend.

## Estrutura de rotas

```
/regras-senior                          → Dashboard
/regras-senior/regras                   → Listagem de regras LSP
/regras-senior/regras/nova              → Formulário de nova regra
/regras-senior/regras/:id               → Detalhes/edição da regra
/regras-senior/identificadores          → Consulta E098REG + ações
/regras-senior/auditoria                → Logs de auditoria
```

Todas protegidas por `<ProtectedRoute>` (mesmo padrão de `/frota`, `/passagens-aereas`).

## Telas

### 1. Dashboard `/regras-senior`
`KpiGrid` (biblioteca BI) com cards:
- Total de regras
- Em rascunho / em revisão / aprovadas
- Identificadores ativos / inativos / em teste (X)
- Últimas alterações (lista compacta dos 5 logs mais recentes)

Aviso fixo no topo (banner amarelo): *"Alterar identificadores pode mudar o comportamento do ERP Senior e pode exigir reinício do ERP/Middleware."*

### 2. Regras LSP `/regras-senior/regras`
Filtros: texto livre, `status_regra` (select), `idereg` (input).
Tabela (DataTableBI) com colunas: ID, Nome, Código ERP, Módulo, Identificador, Transação, Status (badge), Ambiente, Ticket, Criado por, Data, Ações.
Ações por linha: Ver detalhes / Editar / Exportar TXT / Alterar status (dropdown com motivo obrigatório).
Botão no header: "Nova regra" → navega para `/regras-senior/regras/nova`.

### 3. Nova regra `/regras-senior/regras/nova`
Formulário (react-hook-form + zod) com:
- nome_regra, codreg_erp, modsis, idereg, codtns, descricao, ambiente, ticket, motivo
- fonte_lsp: `<textarea>` grande, `font-mono`, altura mínima 400px, line numbers visuais simples (sem dependência nova). 
- Botões: Cancelar / Salvar rascunho / Salvar.
- `POST /api/senior/regras` com Bearer token; redireciona à listagem em sucesso (toast).

### 4. Identificadores `/regras-senior/identificadores`
Filtros: codemp, modsis, idereg, situacao (A/I/X), codreg, texto.
`GET /api/senior/identificadores?...`.
Tabela: Empresa, Módulo, Identificador, Transação, Descrição, Código regra, Situação (badge colorida: A verde, I cinza, X amarelo), Observação, Ações.
Ações: Ver log / Alterar regra vinculada / Alterar situação.
Botões no header: **Gerar Snapshot** (`POST /api/senior/identificadores/snapshot`) + Atualizar.

### 5. Modal "Alterar situação"
Campos: `nova_situacao` (radio A/I/X), `motivo` (textarea obrigatório), checkbox "Confirmo alteração no ERP Senior".
Submit desabilitado até motivo preenchido + checkbox marcado.
`POST /api/senior/identificadores/alterar-situacao` com payload conforme especificado.

### 6. Modal "Alterar regra vinculada"
Campos: `novo_codreg` (number), `motivo`, checkbox confirmar.
`POST /api/senior/identificadores/alterar-regra`.

### 7. Auditoria `/regras-senior/auditoria`
Tabela com paginação consumindo `GET /api/senior/auditoria` (stub inicial — exibe loading/empty se backend ainda não responder).
Filtros básicos: período, tipo de ação, usuário.

## Detalhes técnicos

**Cliente API** — novo arquivo `src/lib/senior/api.ts` exportando:
```ts
listarRegras(filters), criarRegra(body), atualizarStatusRegra(id, payload),
exportarRegraTxt(id), listarIdentificadores(filters),
alterarSituacao(payload), alterarRegraVinculada(payload),
gerarSnapshot(), listarAuditoria(filters)
```
Reusa o `ApiClient` existente (`src/lib/api.ts`) — já injeta `Authorization: Bearer`, `ngrok-skip-browser-warning`, trata 401 redirecionando para `/login`, e usa a base URL configurada em `app_settings.erp_api_url`. **Não criar cliente novo nem ler `VITE_ERP_API_URL` direto** — o projeto já tem essa camada e a URL real vem do `app_settings`.

**Tipos** — `src/lib/senior/types.ts` com interfaces para `RegraLSP`, `Identificador`, `AuditoriaEntry`, enums de status/situação.

**Componentes novos** em `src/components/regras-senior/`:
- `RegrasSeniorDashboard.tsx`
- `RegrasList.tsx`, `RegraForm.tsx`
- `IdentificadoresList.tsx`
- `AlterarSituacaoDialog.tsx`, `AlterarRegraDialog.tsx`
- `AuditoriaList.tsx`
- `SituacaoBadge.tsx`, `StatusRegraBadge.tsx`
- `AvisoErpBanner.tsx`

**Pages** em `src/pages/regras-senior/` envolvendo cada componente.

**Sidebar** — adiciona grupo colapsável "Regras Senior" em `AppSidebar.tsx` com ícone `ShieldAlert` e subitens (Dashboard, Regras LSP, Identificadores, Auditoria). Cada rota cadastrada em `App.tsx` e considerada pelo sistema de permissões (`useUserPermissions`).

**Design system** — somente tokens semânticos (`bg-card`, `text-muted-foreground`, `bg-primary`, `bg-destructive`, `bg-warning` etc.); nenhuma cor hardcoded. Badges de situação reusam `StatusBadge` do BI.

**Estados de UX** — `LoadingState`, `EmptyState`, `ErrorState` da biblioteca BI. Toasts via `sonner`. Validação com `zod` + mensagens em PT-BR. Tabelas com busca, paginação e ordenação (DataTableBI).

## Fora do escopo
- Não implementar o backend FastAPI (apenas consumir).
- Sem RLS / migrations no Lovable Cloud — módulo é puramente cliente do ERP externo.
- Sem editor de código avançado (Monaco) nesta versão; textarea monoespaçada atende.

## Perguntas em aberto
1. **Permissão por perfil**: a rota `/regras-senior/*` deve aparecer para todos os perfis ou só para administradores? (Sugiro restringir via `useUserPermissions` + cadastrar no catálogo de telas.)
2. **Endpoint de status/edição de regra**: a especificação cita "Alterar status" e "Editar" mas não dá os paths. Posso assumir `PATCH /api/senior/regras/:id/status` e `PUT /api/senior/regras/:id`?
3. **Exportar TXT**: gerar no frontend a partir do `fonte_lsp` da regra, ou existe endpoint `GET /api/senior/regras/:id/export`?

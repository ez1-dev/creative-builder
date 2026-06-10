# BI - TAUX / Dimensões

Tela administrativa nova que consome três endpoints do FastAPI (`/api/bi/taux/status`, `/api/bi/taux/sync`, `/api/bi/taux/{nome}`) usando o cliente HTTP existente (`src/lib/api.ts`), que já injeta `Authorization: Bearer <token>`, header `ngrok-skip-browser-warning` e trata 401 redirecionando ao login. Nada nos módulos comerciais existentes é alterado.

## O que será criado

### 1. Camada de API — `src/lib/bi/tauxApi.ts`
Wrapper sobre `apiClient.request` com tipos:
- `getTauxStatus()` → `GET /api/bi/taux/status` → `TauxStatus[]` (`{ taux, tabela, total_registros, ultima_sincronizacao, status, erro? }`).
- `syncTaux(tabelas?: string[])` → `POST /api/bi/taux/sync` com `{ tabelas: tabelas ?? [], acionado_por: 'MANUAL' }`.
- `getTauxData(nome, { q, limit, offset })` → `GET /api/bi/taux/{nome}?...` → `{ data: Record<string,unknown>[]; total?: number; columns?: string[] }` (colunas inferidas das chaves do primeiro registro se o backend não enviar).

Constante `TAUX_LIST` com os 15 nomes informados, usada para fallback quando o status vier vazio.

### 2. Página — `src/pages/bi/TauxAdminPage.tsx`
Layout no padrão do app (`PageHeader` + cards + `DataTableBI`):

- **Header** com botão **"Sincronizar todas as TAUX"** (chama `syncTaux()` sem lista).
- **Cards de status** (`KpiCard` da `@/components/bi`):
  - Total de TAUX
  - TAUX concluídas (status `CONCLUIDO`/`OK`)
  - TAUX com erro (status `ERRO`)
  - Total de registros (soma)
  - Última sincronização geral (max `ultima_sincronizacao`)
- **Tabela de status** (`DataTableBI`) com colunas: TAUX, Tabela Supabase, Total de registros (formatado), Última sincronização (data/hora pt-BR), Status (`StatusBadge`), Ações.
  - Status mapeados por cor: verde (CONCLUIDO/OK), vermelho (ERRO — com tooltip exibindo `erro`), amarelo (INICIADO/EXECUTANDO — spinner), cinza (IGNORADA/desconhecido).
  - Ações por linha: **Visualizar** (abre dialog) e **Sincronizar esta TAUX** (botão com spinner enquanto em execução; estado por-linha em `syncingSet: Set<string>`).
- **Refetch** automático após qualquer sync (`getTauxStatus()`); polling leve (a cada 5 s) enquanto houver itens em `INICIADO/EXECUTANDO`, parando ao concluir.
- Toasts (sonner) para sucesso/erro em todas as chamadas. Erros de rede já vêm tratados pelo `apiClient` (401 → mensagem; tela não trava).

### 3. Modal "Visualizar" — `src/components/bi/taux/TauxViewerDialog.tsx`
- Dialog shadcn full-width com:
  - Cabeçalho com nome da TAUX e tabela Supabase associada.
  - Campo de busca `q` (debounce 300 ms) + select de `limit` (50/100/200/500, default 100).
  - Tabela renderizada dinamicamente: colunas = chaves do primeiro item (ou `columns` retornado pelo backend), valores formatados via `String(v ?? '')` com formatação especial para datas ISO e números.
  - Paginação por `offset` (botões Anterior/Próxima + indicador "página X"); se o backend retornar `total`, mostra contagem real.
  - Loading skeleton + estado vazio.

### 4. Roteamento e navegação
- `src/App.tsx`: adicionar `import TauxAdminPage from "@/pages/bi/TauxAdminPage"` e a rota:
  ```tsx
  <Route path="/bi/taux" element={<ProtectedRoute path="/bi/taux"><TauxAdminPage /></ProtectedRoute>} />
  ```
- `src/lib/screenCatalog.ts`: registrar a tela `/bi/taux` (label "BI - TAUX / Dimensões", grupo "BI") para aparecer no controle de permissões.
- `src/components/AppSidebar.tsx`: adicionar item no grupo BI apontando para `/bi/taux` (visível conforme `canView`).

## Detalhes técnicos

- **Auth**: tudo passa pelo `apiClient.request`, que já adiciona o Bearer salvo no login e trata 401.
- **CORS / ngrok**: o header `ngrok-skip-browser-warning` já é injetado.
- **Estado**: `useQuery` (`@tanstack/react-query`) para `status`, `useMutation` para sync (com `onSettled` invalidando o status). Consulta de dados da TAUX no dialog usa `useQuery` com `queryKey: ['taux', nome, q, limit, offset]`.
- **Sem novas migrações**: a tela é 100% consumidor do FastAPI; tabelas TAUX já existem no Supabase (apenas leitura visual no app via API).
- **Permissões**: rota protegida pelo padrão existente; admins veem por padrão. Outros usuários precisam da tela `/bi/taux` liberada no perfil.

## Fora de escopo
- Não altera nenhum módulo comercial nem reaproveita consumos atuais.
- Não cria edge function nem grava nada no Cloud — apenas leitura/escrita via FastAPI.
- Filtros futuros que consumirão TAUX ficam preparados (API client + tipos prontos), mas não são integrados agora.

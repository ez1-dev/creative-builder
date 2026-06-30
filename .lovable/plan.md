
## Módulo RH

Criar módulo "RH" consumindo a API FastAPI já configurada (usa `api.get/post` de `src/lib/api.ts`, que já injeta Bearer Token e `ngrok-skip-browser-warning`). Nenhum acesso direto ao Senior; somente os endpoints `/api/rh/*`.

### 1. Navegação / Sidebar
- `src/components/AppSidebar.tsx`: novo grupo colapsável **RH** (ícone `Users`) com sub-itens carregados estaticamente (espelhando `/api/rh/menu`):
  - Resumo Folha → `/rh/resumo-folha`
  - Quadro Colaboradores → `/rh/quadro-colaboradores`
  - Contrato Experiência → `/rh/contrato-experiencia`
  - Programação de Férias → `/rh/programacao-ferias`
  - Formulários → `/rh/formularios`
- Rotas registradas em `src/App.tsx` dentro do `AppLayout` protegido.
- Permissões: incluir as 5 rotas no catálogo `src/lib/screenCatalog.ts` para aparecerem em Permissões por Tela.

### 2. Camada de API — `src/lib/rh/api.ts`
Funções tipadas que usam `api.get`/`api.post`:
- `fetchMenuRh()` → `GET /api/rh/menu` (usado pela página índice `/rh` que valida o menu vindo do backend e renderiza cards; sidebar permanece estática).
- `fetchResumoFolha({ anomes_ini, anomes_fim, filial?, matricula? })`
- `fetchQuadroColaboradores({ filial?, situacao?, centro_custo?, cargo?, busca? })`
- `fetchContratoExperiencia({ status?, filial?, colaborador? })`
- `fetchProgramacaoFerias({ status?, filial?, centro_custo?, colaborador? })`
- `fetchFormularios()` / `criarFormulario(payload)`
- `sincronizarRh({ anomes_ini, anomes_fim, codemp = 1 })` → `POST /api/rh/sync` (query params)

Tipagens em `src/lib/rh/types.ts` cobrindo cada linha das tabelas listadas no pedido.

### 3. Telas (`src/pages/rh/`)

Padrão comum: header com título, `Card` de filtros, grid de KPI cards (componente `KpiCard` reaproveitado de `@/components/bi`), `DataTable`/`Table` shadcn com paginação client-side, busca, ordenação básica e botão **Sincronizar RH** no header de todas as telas.

**a) `RhIndexPage.tsx`** (`/rh`)
Carrega `/api/rh/menu` e renderiza cards 01–99 navegando para cada rota. Fallback para itens estáticos se backend falhar.

**b) `ResumoFolhaPage.tsx`** — filtros Ano/mês inicial e final (Input month → converte para `YYYYMM`), Filial (Select alimentado pelas opções distintas do retorno), Matrícula/Colaborador (Input). KPIs: Total proventos, Total descontos, Líquido, Qtd colaboradores (distinct matrícula), Qtd registros. Tabela com 14 colunas conforme spec. Valores em BRL via `formatCurrency`.

**c) `QuadroColaboradoresPage.tsx`** — filtros Filial, Situação, Centro custo, Cargo, Nome/matrícula. KPIs: Total, Ativos, Demitidos, Afastados/Férias (contagem por situação). Tabela 14 colunas.

**d) `ContratoExperienciaPage.tsx`** — filtros Status, Filial, Colaborador. KPIs: Total, Vencidos, ≤10 dias, ≤30 dias, No prazo. Tabela com badges coloridos para `status_contrato`:
- VENCIDO → `bg-destructive text-destructive-foreground`
- VENCE EM ATE 10 DIAS → laranja/vermelho (token `bg-orange-500`/destructive)
- VENCE EM ATE 30 DIAS → amarelo
- NO PRAZO → verde

Cores via tokens semânticos do design system (extender `index.css` se necessário com variáveis `--status-vencido`, `--status-alerta`, `--status-aviso`, `--status-ok`).

**e) `ProgramacaoFeriasPage.tsx`** — filtros Status, Filial, Centro custo, Colaborador. KPIs: Registros, Sem programação, Limite vencido, Limite ≤30 dias, Total dias saldo. Tabela 17 colunas com badges (LIMITE VENCIDO, LIMITE ATE 30 DIAS, SEM PROGRAMACAO, OK) usando os mesmos tokens.

**f) `FormulariosPage.tsx`** — listagem em tabela (Tipo, Título, Matrícula, Colaborador, Status, criado em). Botão **Novo formulário** abre `FormularioDialog` (shadcn Dialog + react-hook-form + zod) com:
- `cd_tp_formulario` Select: FERIAS, CONTRATO_EXPERIENCIA, ATESTADO, ALTERACAO_CADASTRAL, OUTROS
- `ds_titulo` Input, `ds_descricao` Textarea
- `cd_matricula` Input, `ds_colaborador` Input
- `cd_status` Select (default ABERTO)

POST envia exatamente o JSON especificado. Toast de sucesso + refetch.

### 4. Sincronização
Componente compartilhado `SincronizarRhDialog.tsx` (botão no header de todas as telas RH):
- Inputs `month` para anomes inicial/final + `codemp` (default 1).
- Chama `POST /api/rh/sync?anomes_ini=...&anomes_fim=...&codemp=...`.
- Loading state, toast, e ao concluir invalida queries das telas RH (React Query `queryClient.invalidateQueries({ queryKey: ['rh'] })`).

### 5. Padrões técnicos
- React Query (`@tanstack/react-query`) para fetch/cache, queryKey `['rh', screen, filters]`.
- Filtros locais reaproveitados quando a API não os aceita como query param (aplicar `useMemo` sobre o array).
- Formatação: `formatCurrency`, `formatDate` de `src/lib/format.ts`.
- Sem cores hardcoded; usar tokens. Badges via `cn` + variantes definidas.
- Tabelas grandes: `max-h-[70vh] overflow-auto` com header sticky.

### Fora de escopo
- Edição/exclusão de formulários (só listagem + criação).
- Endpoints novos no backend — apenas os 7 já fornecidos.
- Persistência local de filtros entre sessões.

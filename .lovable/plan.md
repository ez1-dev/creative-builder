

# Módulo Produção — Submenu no Sidebar com 7 sub-páginas

## O que muda
Um novo grupo **"Produção"** será adicionado ao sidebar, contendo 7 itens de menu separados, cada um com rota própria. O módulo existente "Eng. x Produção" será movido para dentro desse grupo.

## Estrutura de rotas e endpoints

| Menu                    | Rota                          | Endpoint API                            |
|-------------------------|-------------------------------|-----------------------------------------|
| Dashboard Produção      | `/producao/dashboard`         | `/api/producao/dashboard`               |
| Produzido no Período    | `/producao/produzido`         | `/api/producao/produzido`               |
| Expedido para Obra      | `/producao/expedido`          | `/api/producao/expedido`                |
| Saldo em Pátio          | `/producao/patio`             | `/api/producao/patio`                   |
| Itens Não Carregados    | `/producao/nao-carregados`    | `/api/producao/nao-carregados`          |
| Lead Time Produção      | `/producao/leadtime`          | `/api/producao/leadtime`                |
| Engenharia x Produção   | `/producao/engenharia`        | `/api/producao/engenharia-x-producao`   |

## Implementação

### 1. Sidebar — Grupo colapsável "Produção" (`AppSidebar.tsx`)
- Substituir o item atual "Eng. x Produção" por um grupo "Produção" com os 7 sub-itens
- Usar `SidebarGroup` com `defaultOpen` quando qualquer rota `/producao/*` estiver ativa
- Ícone do grupo: `Factory`; sub-itens com ícones distintos (LayoutDashboard, Hammer, Truck, Warehouse, PackageX, Clock, GitCompare)

### 2. Criar 6 novas páginas + migrar a existente
Cada página seguirá o padrão já usado no projeto (FilterPanel + KPIs + DataTable + Pagination):

- **`ProducaoDashboardPage.tsx`** — KPIs resumo geral + gráficos de visão consolidada
- **`ProduzidoPeriodoPage.tsx`** — Filtros de período/projeto/desenho, tabela de itens produzidos com Kg
- **`ExpedidoObraPage.tsx`** — Filtros de período/obra, tabela de expedições
- **`SaldoPatioPage.tsx`** — Filtros de projeto/produto, tabela de saldo disponível em pátio
- **`NaoCarregadosPage.tsx`** — Filtros de projeto, tabela de itens prontos não expedidos
- **`LeadTimeProducaoPage.tsx`** — Filtros de período/projeto, tabela/gráfico de lead times
- **`EngenhariaProducaoPage.tsx`** — Mover a página existente para a nova rota `/producao/engenharia`, apontar para o novo endpoint `/api/producao/engenharia-x-producao`

### 3. Rotas (`App.tsx`)
- Adicionar as 7 rotas `/producao/*` com `ProtectedRoute`
- Remover a rota antiga `/engenharia-producao` (ou redirecionar para `/producao/engenharia`)

### 4. Tipos da API (`lib/api.ts`)
- Adicionar interfaces genéricas para as respostas de cada endpoint de produção (ex: `ProducaoDashboardResponse`, `ProduzidoResponse`, etc.)
- Como os dados exatos dos endpoints ainda não foram documentados, as interfaces serão criadas com campos genéricos (`dados: any[]`, `resumo: Record<string, any>`) e poderão ser refinadas depois

### Arquivos afetados
- `src/components/AppSidebar.tsx` — grupo Produção com 7 sub-itens
- `src/App.tsx` — 7 novas rotas protegidas
- `src/lib/api.ts` — interfaces de resposta
- 6 novos arquivos em `src/pages/producao/`
- `src/pages/EngenhariaProducaoPage.tsx` — migração de endpoint


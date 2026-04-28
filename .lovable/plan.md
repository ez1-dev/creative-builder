## Nova tela: Relatório Semanal Obra (módulo Produção)

Criar uma visão gerencial complementar à "Expedido para Obra", agrupada por obra/projeto/semana, consumindo a nova rota `GET /api/producao/relatorio-semanal-obra`.

### Arquivos a criar

**`src/pages/producao/RelatorioSemanalObraPage.tsx`** — nova página seguindo o mesmo padrão do `ExpedidoObraPage.tsx`:

- `PageHeader` com título "Relatório Semanal Obra" e botão `ExportButton` (endpoint `/api/export/producao-relatorio-semanal-obra`).
- `ErpConnectionAlert` no topo.
- `FilterPanel` com botões padrão "Consultar" e "Limpar":
  - **Obra** (texto, parâmetro `obra`) — backend filtra por cliente, cidade ou "cliente - cidade".
  - **Projeto** (parâmetro `numero_projeto`).
  - **Data inicial** (`data_ini`, type=date) e **Data final** (`data_fim`, type=date).
  - **Peso mínimo** (`peso_min`, type=number) e **Peso máximo** (`peso_max`, type=number).
- 5 `KPICard` no padrão visual existente (grid 2/5 colunas):
  - Total de obras · Total de projetos · Total de cargas · Total de peças/etiquetas · Peso total expedido (Kg).
  - Valores vêm do `resumo` da resposta; com fallback para agregação client-side caso o backend não envie `resumo`.
- `DataTable` com colunas:
  - Obra · Cliente · Cidade · Projeto · Data inicial (dd/mm/aaaa) · Data final (dd/mm/aaaa) · Qtd Cargas · Qtd Peças · Qtd Expedida · Peso Total (com `formatNumber(v, 2)` + " kg").
- `PaginationControl` (mesmo padrão paginado, `tamanho_pagina: 100`).
- Mensagens:
  - Sem dados → "Nenhum registro encontrado para os filtros informados." (via `DataTable` empty state ou fallback).
  - Erro de fetch → toast "Erro ao consultar relatório semanal de obra."
- Integração `useAiPageContext` (título, filtros, KPIs, summary) e `useAiFilters('producao-relatorio-semanal-obra', ...)` para alinhamento com o assistente.

### Arquivos a editar

**`src/App.tsx`**
- Importar `RelatorioSemanalObraPage`.
- Registrar rota dentro do bloco "Produção":
  ```tsx
  <Route path="/producao/relatorio-semanal-obra" element={
    <ProtectedRoute path="/producao/relatorio-semanal-obra"><RelatorioSemanalObraPage /></ProtectedRoute>
  } />
  ```

**`src/components/AppSidebar.tsx`**
- Adicionar item ao array `producaoSubItems` (após "Expedido para Obra"):
  ```ts
  { title: 'Relatório Semanal Obra', url: '/producao/relatorio-semanal-obra', icon: CalendarRange },
  ```
- Importar `CalendarRange` de `lucide-react`.

**`src/pages/ConfiguracoesPage.tsx`**
- Adicionar `{ path: '/producao/relatorio-semanal-obra', name: 'Produção - Relatório Semanal Obra' }` em `ALL_SCREENS`, para que admin possa conceder permissão de visualização/edição.

### Contratos esperados do backend

- `GET /api/producao/relatorio-semanal-obra?obra=&numero_projeto=&data_ini=&data_fim=&peso_min=&peso_max=&pagina=&tamanho_pagina=`
  - Resposta paginada `{ dados, pagina, total_paginas, total_registros, resumo? }`.
  - Cada item de `dados`: `{ obra, cliente, cidade, numero_projeto, data_inicial, data_final, quantidade_cargas, quantidade_pecas, quantidade_expedida, peso_total }`.
  - `resumo` (opcional, recomendado): `{ total_obras, total_projetos, total_cargas, total_pecas, peso_total }`.
- `GET /api/export/producao-relatorio-semanal-obra` com os mesmos query params → arquivo Excel (já tratado por `ExportButton`).

### Padrões reutilizados

- Autenticação Bearer via `api.get` (já injeta header `Authorization` + `ngrok-skip-browser-warning`).
- Formatação BR via `formatDate` (dd/mm/aaaa) e `formatNumber(v, 2)` (separador de milhar + 2 casas).
- Tokens semânticos do design system (sem cores hardcoded).
- Pixel-parity visual com `ExpedidoObraPage` (paddings, KPIs, FilterPanel).

### Fora do escopo

- Não altera a tela "Expedido para Obra".
- Não cria automaticamente acesso por perfil — admin precisa conceder em **Configurações → Permissões por Tela**.
- Implementação do endpoint backend (FastAPI) é responsabilidade externa; tela já fica funcional assim que a rota responder no contrato acima.

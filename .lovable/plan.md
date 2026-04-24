

## Nova página: Faturamento Genius

### Objetivo
Criar painel completo de faturamento da Genius em `/faturamento-genius`, consumindo os 4 endpoints já existentes no backend, sem alterar páginas atuais.

### Arquivos

**Novo:** `src/pages/FaturamentoGeniusPage.tsx`  
**Editado:** `src/App.tsx` (rota), `src/components/AppSidebar.tsx` (menu), `src/lib/api.ts` (tipagens — opcional, pode ficar `any`).

### Rota e menu
- `App.tsx`: nova `<Route path="/faturamento-genius" element={<ProtectedRoute path="/faturamento-genius"><FaturamentoGeniusPage /></ProtectedRoute>} />`.
- `AppSidebar.tsx`: novo item `{ title: 'Faturamento Genius', url: '/faturamento-genius', icon: Receipt }` (ícone `Receipt` do `lucide-react`), inserido logo após "Auditoria Apont. Genius".

### Estrutura da página
Reaproveita os componentes já existentes do projeto — `PageHeader`, `FilterPanel`, `KPICard`, `KpiGroup`, `DataTable`, `PaginationControl`, `ExportButton`, `ErpConnectionAlert`, `Card`, `Badge`, `Select`, `Switch`, `Input`, `Label`, `Button`, `toast` (sonner), `formatNumber`/`formatDate` de `@/lib/format`.

**Uso da camada `api`:**
- `api.get('/api/faturamento-genius-dashboard', filtros)` e `api.get('/api/faturamento-genius', { ...filtros, pagina, tamanho_pagina: 100 })` — já injetam `Authorization: Bearer <token>` lendo `erp_token` do localStorage e usam `VITE_API_URL` (equivalente ao base URL pedido).
- `api.post('/api/faturamento-genius/atualizar', { anomes_ini, anomes_fim })`.
- Exportação via `<ExportButton endpoint="/api/export/faturamento-genius" params={filtros} />` (já adiciona token via header; backend aceita).

### Filtros (estado único `filters`)
| Campo | Tipo | Default |
|---|---|---|
| `anomes_ini` | Input texto YYYYMM | mês atual |
| `anomes_fim` | Input texto YYYYMM | mês atual |
| `revenda` | Input | vazio |
| `origem` | Select | "Todas" / `MÁQUINAS` / `PEÇAS` / `SERVIÇOS` / `META` / `LANCTO MANUAL` |
| `tipo_movimento` | Select | "TODOS" / `PRODUTOS` / `SERVIÇOS` / `DEVOLUÇÃO` / `FATURAMENTO MAN` |
| `cliente`, `representante`, `produto`, `pedido`, `nf` | Input | vazio |
| `somente_com_revenda` | Switch | false |

Botão **Pesquisar** dispara `consultar()`, **Limpar** zera filtros e estados.

### Fluxo `consultar()`
1. `setLoading(true)` → `Promise.all([apiGetDashboard, apiGetDetalhe(pagina=1)])`.
2. Salva `dashboard` e `detalhe` em estado.
3. `catch` → `toast.error(err.message)`; usa `<ErpConnectionAlert>` para 401.

### Layout (top → bottom)
```text
┌────────────────────────────────────────────────────────────┐
│ PageHeader: "Faturamento Genius"                           │
│ Subtítulo + ações: [Atualizar Comercial] [Exportar Excel]  │
├────────────────────────────────────────────────────────────┤
│ FilterPanel (com todos os campos acima)                    │
├────────────────────────────────────────────────────────────┤
│ KpiGroup "Valores"  [Total][Bruto][Devolução][Custo]       │
│                     [Comissão][Margem Bruta][Margem %]     │
│ KpiGroup "Volume"   [Notas][Pedidos][Clientes][Revendas]   │
│                     [Produtos]                             │
├────────────────────────────────────────────────────────────┤
│ Card "Faturamento por Revenda" — DataTable                 │
│ Card "Faturamento por Origem"  — DataTable                 │
│ Card "Faturamento por Mês"     — DataTable                 │
├────────────────────────────────────────────────────────────┤
│ Card "Detalhe do Faturamento" — DataTable + Paginação      │
├────────────────────────────────────────────────────────────┤
│ <p> nota técnica em texto pequeno (muted) </p>             │
└────────────────────────────────────────────────────────────┘
```

### Cards (KPIs)
Lendo `dashboard.kpis`:
- **Valores** (`KpiGroup tone="volume"`): `valor_total`, `valor_bruto`, `valor_devolucao`, `valor_custo`, `valor_comissao`, `margem_bruta`, `margem_percentual` (formatado `%`, vermelho se `<0` via `tone="destructive"`).
- **Volume** (`KpiGroup tone="saude"`): `quantidade_notas`, `quantidade_pedidos`, `quantidade_clientes`, `quantidade_revendas`, `quantidade_produtos`.
- Formatação: `formatCurrency` (criar helper local `fmtBRL`) e `formatNumber(n,0)`.

### Tabelas resumo
- **Por Revenda** (`dashboard.por_revenda`): colunas conforme spec; coluna `revenda` recebe `<Badge variant="secondary">` quando valor for `OUTROS` ou `LANCTO MANUAL`.
- **Por Origem** (`dashboard.por_origem`).
- **Por Mês** (`dashboard.por_mes`) — `anomes` formatado `MM/YYYY`.

Todas usam `DataTable` com `align: 'right'` em colunas numéricas e renderização em BRL/pt-BR.

### Tabela detalhe + paginação
- Fonte: `detalhe.dados`. Colunas: lista completa da spec (data_emissao formatada, demais via `formatNumber`/BRL).
- `<PaginationControl pagina={detalhe.pagina} totalPaginas={detalhe.total_paginas} totalRegistros={detalhe.total_registros} onPageChange={(p) => recarregarDetalhe(p)} />`.
- `recarregarDetalhe(p)` mantém filtros e chama `api.get('/api/faturamento-genius', {...filtros, pagina: p, tamanho_pagina: 100})`.

### Exportação
`<ExportButton endpoint="/api/export/faturamento-genius" params={filtros} label="Exportar Excel" />` — já abre/baixa com Authorization header.

### Atualizar Comercial
Botão `<Button variant="outline">Atualizar Comercial</Button>` → abre `AlertDialog` (shadcn) com texto pedido. Confirmar → `api.post('/api/faturamento-genius/atualizar', { anomes_ini, anomes_fim })` → `toast.success('Atualização concluída')` → re-executa `consultar()`. Loader inline no botão durante a chamada.

### Nota técnica
Rodapé pequeno (`text-xs text-muted-foreground`):  
*"A revenda vem de VM_FATURAMENTO.CD_REV_PEDIDO. Para produtos, a origem é E120IPD.USU_REVPED; serviços/devoluções podem aparecer como OUTROS conforme a view atual."*

### Garantias
- Nenhuma página existente é modificada (apenas `App.tsx` recebe rota nova e `AppSidebar.tsx` recebe item novo).
- Sem dados mockados; sem alteração no backend.
- Token reutilizado do `localStorage` via `api` (que já cobre o requisito Bearer).
- Responsivo: KPIs em grid 2/4/6 colunas; filtros em grid 1→5 colunas.
- Erros tratados com `toast.error` + `ErpConnectionAlert` para 401.


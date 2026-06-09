# Mapa Brasil por Estado — Biblioteca BI + BI Comercial

## Diagnóstico
- Já existe `BrazilMapCard` (cartograma em grid, sem dependência externa) e ele está registrado em `componentRegistry.tsx` com id `brazil-map`, exibido em `BiComponentsDemoPage` dentro da seção "Gráficos" (linha 485).
- **Por que o usuário não vê o mapa em `/biblioteca-bi`:** o catálogo lá lista o mapa apenas como um item dentro de "Gráficos"; não há card próprio "Mapas / Geográfico" e ele não está exposto no BI Comercial como widget trocável.
- No BI Comercial existe o widget `estados` (kind `map`), mas a variante `map` cai num gráfico genérico em vez de um mapa real ligado a `/api/bi/comercial/estado`.

## O que será feito

### 1. Novo componente `BrazilStateMapWidget`
Arquivo: `src/components/bi/comercial/BrazilStateMapWidget.tsx`
- Wrapper sobre `BrazilMapCard` (cartograma já existente — sem novas dependências).
- Props: `title?`, `filters: BiComercialFilters`, `onDrill?(uf, label)`, `height?`.
- Busca dados via `fetchComercialEstado(filters)` (já existe em `src/lib/bi/comercialApi.ts`) — respeita todos os filtros ativos: `anomes_ini`, `anomes_fim`, `unidade_negocio`, `cd_cliente`, `cd_rev_pedido`, `cd_origem`, `cd_tp_movimento`, `cd_tns`, `cd_produto`, `cd_estado`.
- Normaliza cada linha:
  - `uf  = row.uf || row.cd_estado || row.estado`
  - `nome = row.nm_estado || row.estado_nome || row.estado_label`
  - `valor = row.valor ?? row.faturamento ?? row.vl_faturamento ?? row.valor_faturamento`
- Estados sem valor em cinza claro (já é comportamento do `BrazilMapCard`).
- Tooltip via `title` da célula → `"SP - São Paulo: R$ 23.294.499,14"` (usa `formatEstadoLabel` de `src/lib/bi/ufLabels.ts` e `formatCurrency`).
- Legenda min/max horizontal abaixo do mapa (gradient bar com menor/maior).
- Loading/Empty/Error herdados de `ChartCardShell`.
- **Drill no clique:** chama `onDrill({ dimensao:'estado', campo:'cd_estado', valor: uf, label: 'SP - São Paulo' })` — label é só visual, filtro/drill usa o código cru.

### 2. Registrar na Biblioteca BI (catálogo `/biblioteca-bi`)
Arquivo: `src/pages/BiComponentsDemoPage.tsx`
- Criar nova subseção "Mapas / Geográfico" dentro de "Gráficos" (ou logo após), com card visível:
  - Nome: **Mapa Brasil por Estado**
  - Descrição: *Exibe o faturamento por UF em mapa geográfico do Brasil*
  - Categoria: Mapas
  - Tipo: `brazil_state_map`
- Renderiza `BrazilStateMapWidget` com um mock de filtros (`anomes_ini/fim` do ano corrente) para o usuário ver dados reais do `/api/bi/comercial/estado`.
- Mantém o `BrazilMapCard` genérico existente como exemplo de "cartograma livre" (sem alterar).

### 3. Registrar no `COMPONENT_REGISTRY`
Arquivo: `src/lib/bi/componentRegistry.tsx`
- Nova entrada:
```ts
{
  id: 'brazil-state-map',
  kind: 'chart',
  label: 'Mapa Brasil por Estado',
  defaultSpan: 2,
  inputs: [],            // não usa PageDataContext.series — busca direto
  render: ({ title, ctx }) => <BrazilStateMapWidget title={title} filters={ctx.filters as any} />,
}
```
- O entry **antigo** `brazil-map` (baseado em série) permanece para uso genérico.

### 4. Wire no BI Comercial (`/bi/comercial`)
Arquivo: `src/pages/bi/ComercialPage.tsx` (e `comercialWidgetCatalog.ts`)
- Em `COMERCIAL_WIDGETS.estados`: adicionar `'brazil-state-map'` em `libraryComponentIds` e nova variant `{ value: 'state-map', label: 'Mapa do Brasil (por estado)' }` no `MAP_VARIANTS`.
- No switch de render do widget `estados` em `ComercialPage`: quando `variant === 'state-map'` (ou default da variante `map`), renderizar `<BrazilStateMapWidget filters={filters} onDrill={pushDrill}/>` usando o hook `useComercialDrillStack` já existente (`pushDrill` empilha nível `ESTADO` com `cd_estado`).
- Widget pode ser adicionado, salvo, reposicionado e redimensionado pelo `useComercialLayout` como qualquer outro (defaultSize `w:6 h:5`).

### 5. Permissão por perfil
Arquivo: `src/lib/visualCatalog.ts`
- Novo grupo (ou item dentro do existente) **"BI Comercial / Faturamento"**:
  - `comercial.chart-mapa-brasil` — *Mapa: Faturamento por Estado (Brasil)*
- Envolver o render com `<VisualGate visualKey="comercial.chart-mapa-brasil">`.

## Fora de escopo
- **Não** instalar `react-simple-maps` / `d3-scale` / `d3-format` nem adicionar `public/maps/brazil-states.json`: o `BrazilMapCard` em cartograma já cobre o requisito (UF colorida por intensidade, click, tooltip) e mantém o bundle leve. Se posteriormente quiser SVG geográfico real, abre-se uma segunda iteração — o `BrazilStateMapWidget` será a única superfície a trocar.
- Não alterar `BrazilMapCard.tsx` nem o entry `brazil-map` original.
- Não criar endpoint novo — usa `/api/bi/comercial/estado` que já existe.

## Detalhes técnicos
- Cores: `hsl(var(--primary) / intensity)` com `intensity = valor/max` (já implementado em `BrazilMapCard`); cinza `hsl(var(--muted))` para UF sem dado.
- A legenda horizontal será um `<div>` com gradient `linear-gradient(to right, hsl(var(--primary)/0.12), hsl(var(--primary)))` + labels `formatCurrency(min)` / `formatCurrency(max)`.
- O componente não muda filtros globais; apenas dispara `onDrill` (drill stack do Comercial).
- Sem mudanças em `bi_user_widgets` schema — `component_id = 'brazil-state-map'` é apenas mais um id.

## Arquivos
- **novo:** `src/components/bi/comercial/BrazilStateMapWidget.tsx`
- **editar:** `src/lib/bi/componentRegistry.tsx`, `src/pages/BiComponentsDemoPage.tsx`, `src/pages/bi/ComercialPage.tsx`, `src/lib/bi/comercialWidgetCatalog.ts`, `src/lib/visualCatalog.ts`
- **export:** `src/components/bi/index.ts` (re-exportar o widget)

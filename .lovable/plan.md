## Objetivo
Remover **todos** os mapas geográficos do projeto — tanto os do dashboard `/passagens-aereas` quanto o `BrazilMapCard` da biblioteca BI — já que nenhum funcionou.

## O que será removido

### 1. Componentes (excluir arquivos)
- `src/components/maps/BrazilChoroplethMap.tsx`
- `src/components/passagens/MapaCidadesViagens.tsx`
- `src/components/passagens/MapaDestinosCard.tsx`
- `src/components/passagens/mapaUtils.ts`
- `src/components/bi/charts/maps/BrazilMapCard.tsx` (e pasta `maps/` se vazia)
- `public/geo/brasil-uf.json` (e pasta `public/geo/` se vazia)

### 2. Dependências (`package.json`)
- Remover `react-simple-maps` e `@types/react-simple-maps`

### 3. Dashboard de Passagens Aéreas
- `src/components/passagens/PassagensDashboard.tsx`: remover imports dos 3 mapas, o `useMemo` de `mapaUF` e os 3 blocos `mapa-cidades`, `mapa-choropleth-uf`, `mapa-destinos`.
- `src/hooks/usePassagensLayout.ts`: remover as 3 entradas de mapa do `PASSAGENS_DEFAULT_WIDGETS` e reposicionar `charts-row` e `tabela-registros` para preencher o espaço (y começando em 3).
- `src/lib/visualCatalog.ts`: remover as 3 chaves `passagens.mapa-*`.

### 4. Biblioteca BI
- `src/components/bi/index.ts`: remover export de `BrazilMapCard`.
- `src/lib/bi/componentRegistry.tsx`: remover import de `BrazilMapCard` e a entrada `id: 'brazil-map'`.
- `src/components/bi/templates/ComprasDashboardTemplate.tsx`: remover import e o `<BrazilMapCard>` (manter o resto do template).
- `src/pages/BiComponentsDemoPage.tsx`: remover import e o `DemoBlock` do `BrazilMapCard`.
- `supabase/functions/biblioteca-bi-suggest/index.ts`: remover as 2 menções a `BrazilMapCard` no prompt.

### 5. Banco (migration nova)
Migration que:
- Apaga widgets de mapa de todos os dashboards de passagens (`DELETE FROM dashboard_widgets WHERE type IN ('mapa-cidades','mapa-destinos','mapa-choropleth-uf')`).
- Reescreve a função `upsert_passagens_dashboard_default()` para a nova lista canônica sem mapas: `kpis-row (y=0,h=3)`, `charts-row (y=3,h=12)`, `tabela-registros (y=15,h=10)`.
- Remove permissões `passagens.mapa-*` em `user_visual_permissions` se houver.

### 6. Memória do projeto
Atualizar `mem://features/passagens-aereas` removendo qualquer menção a mapa e registrando que mapas foram descontinuados.

## Arquivos preservados
- `src/components/bi/templates/ComprasDashboardTemplate.tsx` (sem o card de mapa)
- `src/pages/BiComponentsDemoPage.tsx` (sem o demo de mapa)
- `src/lib/treeFinanceiro.ts`, `src/lib/erpFieldLabels.ts` etc. (matches falsos de regex, não são mapas geográficos)

## Resultado esperado
Após a remoção: nenhuma dependência de `react-simple-maps`, nenhum componente de mapa do Brasil, dashboard de Passagens com 3 blocos (KPIs, gráficos, tabela), e biblioteca BI sem `BrazilMapCard`. Build limpo.
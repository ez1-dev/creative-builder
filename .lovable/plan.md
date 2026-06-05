# Corrigir clique no KPI "Impostos" → drill "Detalhes Impostos"

## Diagnóstico
O KPI já está envolvido por `Clickable` em `ComercialPage.tsx` (`renderKpi`, linha 366) e mapeia `impostos → DETALHES_IMPOSTOS`. Porém:

1. `openDrill('DETALHES_IMPOSTOS', {})` é chamado com **contexto vazio**, ignorando filtros ativos do dashboard (mês, cliente, UF, revenda, etc.).
2. O tooltip do `Clickable` é genérico ("Clique para detalhar") — não há affordance específica para impostos.
3. `cd_derivacao` (citado no payload do requisito) não existe em `DrillContexto` nem em `ALLOWED_CTX_KEYS`, então seria descartado se viesse de filtros futuros.
4. `ALLOWED_CTX_KEYS.DETALHES_IMPOSTOS` hoje só permite `cd_nf, cd_produto, anomes_emissao, cd_cliente` — outras chaves vindas dos filtros (`cd_estado`, `cd_rev_pedido`, `cd_origem`, `cd_tns`, `cd_tp_movimento`, `cd_prj`) são silenciosamente removidas pelo `mergeCtx`.

Tabela, CSV e estado vazio do drawer já são genéricos e usam `columns` do backend — nada a mudar lá.

## Mudanças (somente frontend)

### 1. `src/lib/bi/comercialDrillApi.ts`
- Adicionar `cd_derivacao?: string | null` em `DrillContexto`.

### 2. `src/lib/bi/comercialDrillCatalog.ts`
- Em `ALLOWED_CTX_KEYS.DETALHES_IMPOSTOS`, permitir todas as chaves de filtro que o usuário pode aplicar:
  ```
  ['anomes_emissao','cd_estado','cd_cliente','cd_rev_pedido','cd_produto',
   'cd_derivacao','cd_nf','cd_origem','cd_tns','cd_tp_movimento','cd_prj']
  ```
- Adicionar `cd_derivacao: 'Derivação'` em `CTX_LABELS` para aparecer corretamente nos chips do drawer.

### 3. `src/pages/bi/ComercialPage.tsx`
- Criar helper `buildCtxFromFilters(filters)` que copia para `DrillContexto` apenas as chaves presentes nos filtros do dashboard (anomes_emissao, cd_cliente, cd_estado, cd_rev_pedido, cd_origem, cd_tp_movimento, cd_tns, cd_nf, cd_prj). Valores nulos/vazios são omitidos (`cleanContexto` na API já garante).
- No `renderKpi` (≈ linha 366), quando `kpiKey === 'impostos'` passar a chamar diretamente `openDrill('DETALHES_IMPOSTOS', buildCtxFromFilters(filters))` em vez do caminho legado `openDetalhes('impostos', …)`.
- Continuar usando `openDetalhes` para os demais KPIs (sem regressão).

### 4. `src/pages/bi/ComercialPage.tsx` — affordance visual
- Estender `Clickable` para aceitar `title?: string` (mantendo o default atual). No KPI `impostos`, passar `title="Clique para detalhar impostos"`. O hover (`hover:ring-2 ring-ring/50`) e o `cursor-pointer` já existem.

## Fora de escopo
- `useComercialDrillStack`, `ComercialDrillDrawer`, `comercialDrillApi.fetchComercialDrill` (já suportam `DETALHES_IMPOSTOS` e renderizam `columns/rows` retornados pelo backend, incluindo ICMS/IPI/PIS/COFINS/ISS/ICMS ST/DIFAL/Total).
- CSV (`downloadDrillCsv`) — já usa `resp.columns`, portanto exportará automaticamente os campos de impostos.
- Backend FastAPI (`POST /api/bi/comercial/drill`) — sem alteração; o frontend só passa a enviar o `contexto` correto.
- Adicionar filtros novos no dashboard (`cd_produto`, `cd_derivacao`) — fora do pedido; o suporte fica preparado caso passem a ser definidos no futuro.

## Critério de aceite
- Clicar no card "Impostos" abre o drawer com título "Detalhes Impostos".
- O payload enviado contém `drill_type: "DETALHES_IMPOSTOS"`, `anomes_ini/fim`, `unidade_negocio` e o `contexto` espelhando os filtros aplicados (mês, cliente, UF, revenda, origem, TNS, mov., NF, obra).
- O valor exibido no card permanece inalterado.
- Funciona para GENIUS, ESTRUTURAL ZORTEA e CONSOLIDADO.
- Se `rows = []`, o drawer mostra estado vazio com os chips de contexto aplicados (comportamento atual do drawer).
- CSV exporta as colunas devolvidas pelo backend (ICMS, IPI, PIS, COFINS, ISS, ICMS ST, DIFAL, Total Impostos).

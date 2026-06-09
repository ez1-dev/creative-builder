## Diagnóstico

Confirmei via `rg`: **não há** `30000000`, `META_PADRAO`, `metaDefault`, `defaultMeta` nem `fallbackMeta` em `src/`. O único cálculo de meta no front fora da RPC é `fetchMetaCloudTotal` em `src/lib/bi/metasFaturamentoApi.ts` (usado em outras telas, **não** no card `resumo-faturamento`).

O card `resumo-faturamento` (ComercialPage.tsx 651–691) hoje já usa `??` (não `||`) e lê direto de `qKpis.data`. Os ajustes pedidos são:

1. Encurtar o fallback para o exato exigido (sem `vl_bruto`, sem `vl_realizado`, sem `total_meta`, sem usar `bruto` como fallback de líquido).
2. Remover o `console.log('KPIS COMERCIAL RAW:', data)` temporário e o campo `total_meta` adicionado no tipo.
3. Calcular `atingimento` localmente (não usar `kpis.pct_atingimento`) para que reflita o mesmo `fatLiquido/meta` do card.

A parte de "API deve sincronizar da `EZORTEA.V_FATURAMENTO_META` e sobrescrever a RPC" é **backend (FastAPI)** — fora do escopo do front. Vou registrar a exigência em `docs/backend-bi-comercial-meta-sobrescrever-rpc.md` para o time de backend implementar.

## Mudanças no Front

### 1. `src/pages/bi/ComercialPage.tsx` — bloco `resumo-faturamento` (linhas 651–691)
Substituir o cálculo por exatamente:
```ts
const k: any = kpis;
const bruto = Number(k?.faturamento ?? 0);
const fatLiquido = Number(
  k?.faturamento_liquido ?? k?.fat_liquido ?? k?.realizado ?? 0
);
const meta = Number(k?.meta ?? k?.vl_meta ?? 0);
const diferenca = fatLiquido - meta;
```
Itens do `KpiTriStackCard` permanecem os 4 (Bruto, Líquido, Meta, Diferença). `Fat. Bruto` continua usando `bruto` para não esconder dado existente.

### 2. `src/pages/bi/ComercialPage.tsx` — bloco `gauge-atingimento` (linhas 693–702)
Calcular atingimento a partir de `fatLiquido` e `meta` da RPC, ignorando `pct_atingimento` (que o backend calcula com bruto):
```ts
const fatLiquido = Number(k?.faturamento_liquido ?? k?.fat_liquido ?? k?.realizado ?? 0);
const meta = Number(k?.meta ?? k?.vl_meta ?? 0);
const atingimento = meta > 0 ? (fatLiquido / meta) * 100 : 0;
```
Passar `atingimento` ao `GaugeAchievementCard`.

### 3. `src/lib/bi/comercialApi.ts`
- Remover `console.log('KPIS COMERCIAL RAW:', data)` e o `// TODO` correspondente.
- Remover `total_meta?: number | null` do tipo `ComercialKpis` (não faz parte do contrato pedido).

## Documento para o backend

### 4. `docs/backend-bi-comercial-meta-sobrescrever-rpc.md` (novo)
Especificação curta:
- Endpoint `GET /api/bi/comercial/kpis` deve, ao montar a resposta, buscar a meta consolidada do período/unidade em `bi_meta_faturamento` (sincronizada a partir de `EZORTEA.V_FATURAMENTO_META`) e **sobrescrever** os campos `meta`, `diferenca` e `pct_atingimento` retornados pela RPC do ERP.
- `diferenca = fat_liquido − meta`; `pct_atingimento = fat_liquido / meta * 100` (0 se meta = 0).
- Endpoint `POST /api/bi/comercial/metas/sincronizar` (já existe via `sync-metas-upquery`) deve garantir gravação em `bi_meta_faturamento` antes do recálculo.
- Front nunca aplica fallback fixo: se a meta vier 0/null, o card mostra 0.

## Fora de escopo
- `fetchMetaCloudTotal` em `metasFaturamentoApi.ts` (usado por outras telas).
- Mudanças na RPC/ERP — backend resolve.

## Validação
1. `/bi/comercial` carrega sem console.log de KPIS.
2. Card "Faturamento" mostra Bruto, Líquido, Meta, Diferença com os valores exatos de `kpis.faturamento`, `kpis.faturamento_liquido/fat_liquido/realizado`, `kpis.meta/vl_meta`.
3. Gauge `% Atingimento` = (líquido / meta) × 100, sem usar `pct_atingimento` do backend.
4. Quando o backend implementar a sobrescrita, o valor "Meta" passa a refletir `bi_meta_faturamento` automaticamente — sem mudança no front.

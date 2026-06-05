## Objetivo

Substituir o drill atual (que só lista "Notas Fiscais" via `/api/bi/comercial/detalhes`) por um sistema de **drills multinível navegáveis** chamando um endpoint único `POST /api/bi/comercial/drill`, com breadcrumb, contexto acumulado, seletor de próximo nível e exportação CSV.

A FastAPI já expõe (ou vai expor) o endpoint. No Lovable só ajustamos frontend + camada de API.

---

## Drills suportados

`ACUMULADO`, `MENSAL`, `ESTADO`, `CLIENTE`, `REVENDA`, `PRODUTO`, `NOTA_FISCAL`, `DETALHES_IMPOSTOS`.

Cada drill define:
- Coluna agrupadora (`groupKey`)
- Próximos drills permitidos (ex.: Mensal → Estado, Cliente, Revenda, Produto, NF; NF → Detalhes Impostos)
- Colunas padrão exibidas

---

## Camada de API

**Novo:** `src/lib/bi/comercialDrillApi.ts`

```ts
export type DrillType =
  | 'ACUMULADO' | 'MENSAL' | 'ESTADO' | 'CLIENTE'
  | 'REVENDA'   | 'PRODUTO'| 'NOTA_FISCAL' | 'DETALHES_IMPOSTOS';

export interface DrillContexto {
  anomes_emissao?: string;
  cd_origem?: string;
  cd_estado?: string;
  cd_cliente?: string;
  cd_rev_pedido?: string;
  cd_prj?: string;
  cd_tns?: string;
  cd_tp_movimento?: string;
  cd_nf?: string;
  cd_produto?: string;
  categoria_custom?: 'PEÇAS' | 'SERVIÇOS' | string;
}

export interface DrillRequest {
  drill_type: DrillType;
  anomes_ini: string;
  anomes_fim: string;
  unidade_negocio: 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'CONSOLIDADO';
  contexto: DrillContexto;
  page?: number;
  page_size?: number;
}

export interface DrillResponse {
  titulo: string;
  drill_type: DrillType;
  breadcrumb: { label: string; filtro: Record<string, any> }[];
  columns: { key: string; label: string; align?: 'left'|'right'; format?: 'currency'|'number'|'date'|'text' }[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  page_size: number;
}

export async function fetchComercialDrill(req: DrillRequest): Promise<DrillResponse>;
export function downloadDrillCsv(resp: DrillResponse, filename?: string): void;
```

Chama via `api.post('/api/bi/comercial/drill', body)`. Trata erros (rede, 4xx/5xx) devolvendo erro tipado para a UI mostrar diagnóstico amigável.

**Normalização de `categoria_custom`** (feita no client antes de enviar, e mantida no contexto):
- `PEÇAS` → adiciona regra `cd_origem LIKE 'PE%'` (enviada como `categoria_custom`, FastAPI converte; mantemos também o campo bruto no contexto).
- `SERVIÇOS` → `cd_origem LIKE 'SERV%' OR cd_tp_movimento LIKE 'SERV%'`.

A conversão final é do backend; o frontend só passa `categoria_custom` no contexto.

---

## Mapa de transições entre drills

`src/lib/bi/comercialDrillCatalog.ts`

```ts
NEXT_DRILLS: Record<DrillType, DrillType[]> = {
  ACUMULADO:        ['MENSAL','ESTADO','CLIENTE','REVENDA','PRODUTO','NOTA_FISCAL'],
  MENSAL:           ['ESTADO','CLIENTE','REVENDA','PRODUTO','NOTA_FISCAL'],
  ESTADO:           ['CLIENTE','REVENDA','PRODUTO','NOTA_FISCAL'],
  CLIENTE:          ['REVENDA','PRODUTO','NOTA_FISCAL'],
  REVENDA:          ['CLIENTE','PRODUTO','NOTA_FISCAL'],
  PRODUTO:          ['NOTA_FISCAL','DETALHES_IMPOSTOS'],
  NOTA_FISCAL:      ['PRODUTO','DETALHES_IMPOSTOS'],
  DETALHES_IMPOSTOS:[],
};
ROW_TO_CTX_KEY: Record<DrillType, keyof DrillContexto> // ex: CLIENTE → 'cd_cliente'
DRILL_LABELS: Record<DrillType,string>
```

---

## Estado do drill (refator do `useDrillSheet`)

Estender o hook em `src/components/bi/drill/DrillSheet.tsx` (ou criar `useComercialDrillStack` específico em `src/hooks/useComercialDrillStack.ts` para não quebrar outros usos) com:

- Pilha de níveis: `{ drill_type, contexto, response? }[]`
- Ações: `openWith(initial)`, `pushDrill(drill_type, rowCtx)`, `pop()`, `goTo(index)`, `reopenSelector()`, `close()`
- Cada `push` faz merge `contexto = { ...current.contexto, ...rowCtx }`.
- `useQuery` por nível usando `keepPreviousData` e a chave `['comercial-drill', drill_type, contexto, page]`.

Os filtros globais do dashboard (`filters`) permanecem intocados — eles só viram `anomes_ini`, `anomes_fim`, `unidade_negocio` e contexto inicial.

---

## UI do drawer

Reescrever conteúdo do `<DrillSheet>` no `ComercialPage.tsx`:

1. **Breadcrumb** já existente continua mostrando a pilha (`drill.sheetProps.levels`), agora alimentado com `title = DRILL_LABELS[drill_type] + valor`.
2. **Toolbar** dentro do drawer:
   - `DrillLevelSelector` (já existe) mostrando `NEXT_DRILLS[current.drill_type]` → `pushDrill`.
   - Botão **"Trocar drill"** que reabre o seletor a qualquer momento.
   - Botão **Exportar CSV** chamando `downloadDrillCsv`.
   - Editor de colunas (popover já existente) passa a usar `response.columns` + `useDrillPresets` por `drill_type`.
3. **Tabela** usa `DataTableBI`, gerada dinamicamente a partir de `response.columns` (com formatadores `currency`/`number`/`date`).
   - Cada linha clicável: abre menu/popover com os próximos drills permitidos; cada item chama `pushDrill(nextType, rowCtx)` onde `rowCtx` é montado a partir de `ROW_TO_CTX_KEY[currentDrill]` e o valor da chave principal da linha (ex.: `cd_cliente`).
4. **Paginação** simples (Anterior/Próxima + total) chamando `setPage` que dispara nova `useQuery`.
5. **Estados**: `LoadingState`, `EmptyState` ("Sem registros para o contexto atual"), `ErrorState` com mensagem amigável + botão "Tentar novamente" (chamando `refetch`).

---

## Disparadores (cliques no dashboard)

Em `ComercialPage.tsx` substituir `openDetalhes` e `applyDrill` por novo handler:

```ts
const openDrill = (drill_type, ctxFromClick = {}) =>
  drillStack.openWith({
    drill_type,
    contexto: { ...ctxFromClick }, // anomes_emissao, cd_estado, etc.
  });
```

Mapeamento de cliques:
- KPI Faturamento/Meta/Líquido → `ACUMULADO`.
- KPI Impostos → `ACUMULADO` (e o seletor leva a `DETALHES_IMPOSTOS`).
- Gráfico/tabela **Mensal** → `MENSAL` (clique em barra: já abre `MENSAL` filtrado em `anomes_emissao = label`, ou usa `ACUMULADO` se for KPI).
- Donut **Mix** → contexto `cd_origem` ou `categoria_custom` + drill `ACUMULADO`.
- **Estado/Mapa** → `ESTADO` + `cd_estado`.
- **Revenda** → `REVENDA` + `cd_rev_pedido`.
- **Obra** → `ACUMULADO` + `cd_prj`.
- AI Chart (`AiChartGenerator.onDrill`) → mapeia `dimensao` para `DrillType` correspondente e abre o stack com o `label` no contexto. Garantia: mesma sheet, mesmos próximos níveis.

Os filtros globais (chips no header) continuam funcionando como hoje — não são mexidos pelo drill.

---

## Migração do código existente

- Manter `fetchComercialDetalhes` e o escopo antigo apenas como fallback (não remover ainda) — mas o drawer principal passa a usar o novo endpoint. Remover do drawer a referência a `escopo` / `ESCOPO_LABELS` para Comercial.
- `useDrillPresets` continua válido; usar como `pageKey='bi-comercial'` e `escopo = drill_type`.

---

## Arquivos

**Criar**
- `src/lib/bi/comercialDrillApi.ts` — tipos, `fetchComercialDrill`, `downloadDrillCsv`.
- `src/lib/bi/comercialDrillCatalog.ts` — `NEXT_DRILLS`, `ROW_TO_CTX_KEY`, `DRILL_LABELS`.
- `src/hooks/useComercialDrillStack.ts` — pilha + integração com `useQuery`.
- `src/components/bi/drill/ComercialDrillDrawer.tsx` — drawer dedicado (usa `DrillSheet` interno + toolbar + tabela dinâmica + paginação + CSV).

**Editar**
- `src/pages/bi/ComercialPage.tsx` — substituir `useDrillSheet` + `<DrillSheet>` pelo novo drawer; trocar handlers `openDetalhes` / `onClickMensal` / `onClickEstado` / `onClickRevenda` / `onClickObra` / `onClickMix` para `openDrill(...)`; conectar `AiChartGenerator.onDrill`.
- `src/components/bi/drill/DrillSheet.tsx` — sem mudanças funcionais (mantém breadcrumb/back).

**Não tocar**
- `src/integrations/supabase/*`, `.env`, FastAPI, esquema do banco.
- Outros consumidores de `useDrillSheet` (compras, produção, etc.).

---

## Critérios de aceite (validação)

- Clicar em uma barra de "Maio" abre drill com `contexto.anomes_emissao = 202605` e mostra próximos níveis.
- Clicar em "GENIUS" no chip de unidade mantém `unidade_negocio = GENIUS` em toda a pilha.
- Breadcrumb permite voltar a níveis anteriores sem perder o contexto pai.
- Botão "Trocar drill" reabre o seletor de níveis a qualquer momento.
- Tabela do drill `DETALHES_IMPOSTOS` mostra colunas `vl_icms, vl_ipi, vl_pis, vl_cofins, vl_iss, vl_icmsst, vl_difal, vl_impostos`.
- Gráfico gerado pela IA dispara o mesmo drawer.
- Em caso de erro de rede / 5xx, mostra `ErrorState` com mensagem amigável e botão de retry (sem tela em branco).
- Exportar CSV gera arquivo com as colunas/linhas do nível atual.
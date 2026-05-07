## Diagnóstico

Examinei o pipeline de runtime dos widgets aplicados:

`PageDataProvider` → `UserWidgetsSlot` → `componentRegistry.render({ ctx })` → componentes BI.

Cada página alvo declara um schema (em `pageRegistry.ts`) e expõe os dados via `PageDataProvider` (kpis/series/rows). Quando os filtros mudam, esses memos recalculam e o slot re-renderiza. Esse fluxo funciona — mas há **3 falhas** que fazem widgets aparecerem vazios mesmo havendo dados filtrados:

### Falha 1 — Séries em formato incompatível (mais crítica)
`componentRegistry.tsx` usa o helper `SERIES_LIKE` que só reconhece `{label|name|x, valor|value|y}` e descarta itens sem `label`.

- `FaturamentoGeniusPage`: passa `series={{ por_revenda, por_anomes }}` em formato bruto (`{revenda, valor_total, ...}` / `{anomes, ...}`). Resultado: arrays viram `[]` no widget.
- `ProducaoDashboardPage`: passa `series={}` — schema declara `producao_por_dia` e `top_produtos` mas nada é fornecido.
- `PainelComprasPage` e `NotasRecebimentoPage` já normalizam corretamente.

### Falha 2 — KPIs não cobrem todo o schema
- `EstoqueMinMaxPage`: `kpis={kpis}` vem do backend com chaves possíveis em outros nomes; precisa garantir mapeamento para `abaixo_minimo`, `acima_maximo`, `sem_politica`, `ok`, `sugestao_minimo_total`, `sugestao_maximo_total`.
- `ContasPagarPage`: usa `data.resumo` direto — quando vem do backend, os nomes podem estar diferentes do schema. Precisa normalizar.
- `FaturamentoGeniusPage`: KPIs alinhados ao schema, sem ação.

### Falha 3 — Helper `SERIES_LIKE` muito restritivo
Mesmo após normalizar nas páginas, é prudente tornar o helper mais tolerante (cair em "primeira string" como label e "primeiro número" como valor) para evitar que pequenas divergências quebrem o widget.

Resultado dessas falhas: ao aplicar (por exemplo) um KPI no Faturamento Genius com filtro de revenda ativo, ele lê do `ctx.kpis` certinho e funciona; mas qualquer **gráfico** aplicado nas páginas Faturamento Genius ou Produção Dashboard fica em branco porque a série chega como `[]`.

## Plano de correção

### 1) Tornar `SERIES_LIKE` tolerante
`src/lib/bi/componentRegistry.tsx`
- Se item tem `label/name/x`, usar; senão, usar a 1ª chave string do objeto.
- Se item tem `valor/value/y`, usar; senão, usar a 1ª chave numérica.
- Manter compatibilidade com formato atual.

### 2) Normalizar séries no `PageDataProvider` de cada página
- `FaturamentoGeniusPage.tsx`: converter `porRevenda` → `[{label: revenda, valor: valor_total}]` e `porMes` → `[{label: fmtAnomes(anomes), valor: valor_total}]`. Adicionar também `por_origem` ao schema e ao provider para abrir mais opções.
- `ProducaoDashboardPage.tsx`: derivar `producao_por_dia` e `top_produtos` a partir das estruturas já carregadas (ou enviar `[]` explicitamente quando ausente, mas mapeando o schema). Se o backend não fornece, registrar isso no schema removendo séries que não estão disponíveis.

### 3) Normalizar KPIs nas páginas que diferem
- `EstoqueMinMaxPage.tsx`: garantir que o objeto `kpis` exposto contém exatamente as chaves do schema (`abaixo_minimo`, `acima_maximo`, `sem_politica`, `ok`, `sugestao_minimo_total`, `sugestao_maximo_total`), derivando do `enrichedData` quando o backend não fornecer.
- `ContasPagarPage.tsx`: reutilizar o mesmo objeto `kpis` (`useMemo`) que já constrói as chaves do schema (já existe o fallback manual — basta usar sempre a normalização ao invés de `data.resumo` cru quando os campos não baterem).

### 4) Diagnóstico em desenvolvimento
`src/components/bi/runtime/UserWidgetsSlot.tsx`
- Se em DEV e o `mapping` referencia uma chave que não existe no `ctx.kpis`/`ctx.series`/`ctx.rows`, emitir `console.warn` apontando o widget e a chave faltante (ajuda diagnósticos futuros sem afetar produção).

### 5) Atualização do `pageRegistry.ts` (Produção)
Ajustar `producao-dashboard.schema.series` para somente listar séries que a página de fato publica (evita usuário aplicar gráfico que nunca terá dados).

## Resultado esperado
- Gráficos aplicados em Faturamento Genius e Produção Dashboard passam a mostrar dados filtrados em tempo real.
- KPIs aplicados em Estoque Min/Max e Contas a Pagar refletem os filtros sem `0` espúrio.
- Helpers mais tolerantes evitam regressões caso novas séries sejam adicionadas com nomes de campo diferentes.
- Em DEV, qualquer mapeamento órfão grita no console.

## Arquivos a alterar
- `src/lib/bi/componentRegistry.tsx`
- `src/lib/bi/pageRegistry.ts`
- `src/components/bi/runtime/UserWidgetsSlot.tsx`
- `src/pages/FaturamentoGeniusPage.tsx`
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/pages/EstoqueMinMaxPage.tsx`
- `src/pages/ContasPagarPage.tsx`

Sem migrações de banco. Sem alterações em RLS.
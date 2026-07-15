
## Objetivo

Introduzir uma camada de **validação de schema (Zod)** entre a API e os hooks do Dashboard Geral, para que campos ausentes, tipos incorretos, strings numéricas ("1.234,56"), `null`/`undefined` e chaves alternativas sejam normalizados de forma previsível antes de chegar aos KPIs, gráficos e tabelas.

## Motivação

Hoje os 8 hooks em `src/hooks/dashboardGeral/*.ts` fazem *coercion* manual (`num(k.valor_total ?? k.fat_liquido ?? …)`, `String(r.revenda ?? …)`) espalhada por várias linhas. Esse padrão:

- Perde dados quando o backend renomeia campos ou envia números como string.
- Não avisa quando o payload muda; o card só some/zera silenciosamente.
- Duplica lógica de fallback em cada hook, dificultando manutenção.

Com schemas Zod centralizados, cada resposta passa por `schema.safeParse` → objeto normalizado com defaults garantidos → hook apenas seleciona/agrega.

## Escopo

### 1. Infra de validação — `src/lib/dashboardGeral/schemas/`

Novo diretório com:

- **`_utils.ts`**
  - `zNum` — Zod schema que aceita `number | string | null | undefined` e devolve `number` (parseia "1.234,56", trata `NaN`/`Infinity` → 0).
  - `zStr(maxLen?)` — string tolerante, aplica `trim()` e slice.
  - `zArr<T>(item)` — coerção defensiva: `null`/objeto → `[]`.
  - `parseOrEmpty(schema, data, fallback, moduleName)` — executa `safeParse`; em falha, loga uma vez em `console.warn` com o path do primeiro erro e devolve `fallback`; em modo dev registra também no `logger` do projeto para o painel de erros.

- **`comercial.ts`**, **`compras.ts`**, **`financeiro.ts`**, **`contabilidade.ts`**, **`rh.ts`**, **`producao.ts`**, **`estoque.ts`**, **`manutencao.ts`**
  - Um schema por endpoint (ex. `FaturamentoGeniusResponseSchema`, `PainelComprasResponseSchema`, `DreResumoResponseSchema`, `BalancoPatrimonialResponseSchema`, `TurnoverResponseSchema`, `AbsenteismoResponseSchema`, `ResumoFolhaResponseSchema`, `QuadroColaboradoresSchema`, `CargaCentrosResponseSchema`, `CargaRecursosResponseSchema`, `EstoqueMinMaxResponseSchema`, `ManutencaoRowSchema`).
  - Cada schema já **normaliza aliases** conhecidos (ex. `valor_total ?? valor ?? fat_liquido`) via `z.preprocess` para eliminar as cadeias de `??` dos hooks.
  - Exporta `type` inferido (`z.infer`) e o `EMPTY` default.

### 2. Refatorar hooks

Cada arquivo em `src/hooks/dashboardGeral/*.ts` passa a:

1. Chamar `queryFn` como hoje.
2. Aplicar `parseOrEmpty(SchemaX, rawData, EMPTY_X, 'comercial')` no `useMemo`.
3. Operar em cima do resultado tipado — remove os `?? ?? ??` intermediários e o `as any`.
4. O `status` do hook ganha um novo estado `'parcial'` quando o schema devolveu `fallback` (payload ilegível) — hoje é `'erro'` no `statusFrom`.

Sem mudar interface externa (`data.kpis.faturamento`, etc.), então tabs e `VisãoGeralTab` não precisam de alterações — apenas ganham dados mais estáveis.

### 3. Sinalização de payload parcial nos cards

- Adicionar prop opcional `status?: 'ok' | 'parcial' | 'erro'` no `KpiCard`.
  - `'parcial'` desenha um `Info` badge discreto com tooltip "Alguns campos vieram incompletos da API — mostrando o que foi reconhecido".
- Aplicar apenas nos KPIs headline das abas do Dashboard Geral, reutilizando `data.status` do hook.
- Nenhuma outra página é afetada (prop é opcional, default = `'ok'`).

### 4. Testes leves de contrato

Adicionar `src/lib/dashboardGeral/schemas/__tests__/parse.spec.ts` cobrindo:

- Payload real (fixture mínima) → parseia OK.
- Payload com campos como string numérica → normaliza para `number`.
- Payload com chaves faltando → aplica defaults sem lançar exceção.
- Payload `null`/`undefined` → devolve `EMPTY`.

Usa `vitest` (já no projeto).

## Fora de escopo

- Endpoints, migrations, backend, cálculos de negócio — nada muda.
- Não é adicionado nenhum card ou gráfico novo.
- Nenhum outro dashboard (BI Comercial, Financeiro, etc.) é tocado — apenas o Dashboard Geral.

## Arquivos afetados

**Novos:**
- `src/lib/dashboardGeral/schemas/_utils.ts`
- `src/lib/dashboardGeral/schemas/{comercial,compras,contabilidade,estoque,financeiro,manutencao,producao,rh}.ts`
- `src/lib/dashboardGeral/schemas/__tests__/parse.spec.ts`

**Editados:**
- `src/hooks/dashboardGeral/{useComercial,useCompras,useContabilidade,useEstoque,useFinanceiro,useManutencao,useProducao,useRh}.ts` — passam por `parseOrEmpty`.
- `src/hooks/dashboardGeral/shared.ts` — `ModStatus` inclui `'parcial'`.
- `src/components/bi/kpis/KpiCard.tsx` — nova prop opcional `status` + badge.
- (opcional) `src/pages/dashboard-geral/tabs/*.tsx` — passar `status={data.status}` nos KPIs headline.

## Resultado esperado

Todos os KPIs e cards do Dashboard Geral renderizam com o valor correto sempre que o payload contiver a informação — mesmo com campos ausentes, tipos trocados, aliases antigos ou strings numéricas. Payloads irreconhecíveis param nos schemas com um `console.warn` claro e um badge "parcial" no card, evitando a falha silenciosa atual.

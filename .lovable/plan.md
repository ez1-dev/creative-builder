## Objetivo

Refatorar o consumo de `/api/bi/contabilidade/dre-dinamica/plano-contas` em `src/lib/bi/dreMontadorApi.ts` para seguir exatamente o contrato da RPC `bi_dre_plano_contas_disponivel_v2` e o spec passado pelo usuário, com logs de diagnóstico explícitos.

## Mudanças em `src/lib/bi/dreMontadorApi.ts`

1. **Extrair função `normalizeCentrosCusto(raw)`** no formato exato do spec:
   - `!raw` → `[]`
   - `string` → `JSON.parse` (em catch → `[]`)
   - `!Array.isArray` → `[]`
   - `.filter(item => item && typeof item === 'object')`
   - `.map(...)` produzindo os 6 campos canônicos (`cd_centro_custos`, `cd_centro_custos_3`, `qtd_lancamentos`, `valor_total`, `vl_realizado`, `ds_centro_custos`), com aliases `cd_centro_custo`/`centro_custo` e fallback `cd.slice(0,3)` para o nível 3
   - `.filter(item => item.cd_centro_custos)` no final (descarta itens sem código)

2. **Logs `[MONTADOR DRE]` após o `fetch`**, antes da normalização:
   - `primeira conta (bruta):` `arr[0]`
   - `Object.keys:` `Object.keys(arr[0])`
   - `typeof centros_custo:` `typeof arr[0].centros_custo`
   - `centros_custo (bruto):` `arr[0].centros_custo`

3. **No mapper de cada conta**, ler **apenas** `r.centros_custo` (campo canônico) e passar por `normalizeCentrosCusto`. Remover os fallbacks de aliases de array (`ccu`, `centroscusto`, `centros`, `cc`, `centros_de_custo`) — conforme item 9 do spec, esses nomes não devem ser usados como campo principal.

4. **Validação semCcu** continua usando o resultado normalizado (`mapped.some(m => m.centros_custo.length > 0)`), mas o warning passa a apontar para a RPC `bi_dre_plano_contas_disponivel_v2` como referência do contrato esperado.

5. **Logs pós-normalização** (mantidos): `mapped[0].centros_custo.length`, primeira amostra, e o warning detalhado quando todas as contas vêm sem CCU.

## Não muda

- `PlanoContaCentroCusto` interface (já tem os 6 campos).
- `fetchPlanoContasDinamica` assinatura, query params, headers.
- `vincularContasDinamica`, `resolverLinhaId`.
- Nada em `DreMontadorPage.tsx` — o banner já consome `centros_custo.length` do resultado mapeado.

## Critério de aceite

- Console mostra os 4 logs brutos pedidos (item 2–5 do spec) antes da normalização.
- Conta `311020006` aparece com `centros_custo.length === 17`.
- Banner "Backend não retornou…" só aparece se `contasNormalizadas.every(c => c.centros_custo.length === 0)`.
- Nenhum uso de `centros_custos`/`centro_custo`/`centros` como campo principal.

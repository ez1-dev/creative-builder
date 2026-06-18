## Objetivo

Refatorar `src/lib/bi/dreMontadorApi.ts` para não zerar valores quando o backend devolver `vl_realizado`/`realizado` em vez de `valor_total`, ou quando vier como string pt-BR. Também ajustar a validação de "valores zerados" para considerar valores nos centros de custo.

## Mudanças em `src/lib/bi/dreMontadorApi.ts`

1. **Nova função `toNumberBI(value)`** (exportada):
   - `null`/`undefined`/`""` → `0`
   - `number` → retorna direto
   - string com vírgula → trata como pt-BR (`replace(/\./g, '').replace(',', '.')`)
   - string sem vírgula → `Number(text)` (preserva `"-124811.54"`)
   - `Number.isFinite` falso → `0`

2. **`normalizeCentrosCusto`** passa a usar `toNumberBI` para `valor_total`/`vl_realizado`, casando o spec (espelha `valor_total = vl_realizado = valorCentro`).

3. **`fetchPlanoContasDinamica`** — no mapper de cada conta:
   - `valorConta = toNumberBI(r.valor_total ?? r.vl_realizado ?? r.realizado ?? 0)`
   - escreve `valor_total = vl_realizado = valorConta` no objeto mapeado
   - mantém `centros_custo` normalizado

4. **Validação `temValor`** substitui a `semValor` atual:
   - `mapped.some(conta => abs(valor_total) > 0 || centros_custo.some(cc => abs(cc.valor_total) > 0))`
   - Warning "Valores zerados" só sai quando `!temValor`

5. **Logs obrigatórios** (após o mapping):
   - `primeira conta bruta` (`arr[0]`)
   - `primeira conta normalizada` (`mapped[0]`)
   - `qtd contas com valor`
   - `soma valor_total`
   - log específico da conta `311020006` (valor + qtd centros)

## Tipo

Adicionar `vl_realizado?: number` e `realizado?: number` opcionais em `PlanoContaErp` para refletir os campos espelhados.

## Não muda

- Assinatura de `fetchPlanoContasDinamica`, `vincularContasDinamica`, `resolverLinhaId`.
- Logs brutos da primeira conta (`Object.keys`, `typeof centros_custo`) já implementados na rodada anterior — preservados.
- `DreMontadorPage.tsx` (consome `valor_total` do objeto mapeado).

## Critério de aceite

- Conta `311020006` aparece com `valor_total !== 0` e `centros_custo.length === 17`.
- Aviso "Valores zerados" só dispara quando TODAS as contas e TODOS os centros têm valor 0.
- Strings pt-BR (`"-124.811,54"`) e en-US (`"-124811.54"`) são ambas parseadas corretamente.

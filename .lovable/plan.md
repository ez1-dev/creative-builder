## Problema

No RH-04, clicar numa célula da tabela "Limite Férias" (ex.: `12/2026 = 19`) abre o modal com "0 períodos". Backend está correto (19 registros existem em `detalhe` com `ano_limite="2026"`, `mes_limite=12`). O filtro no front está falhando por mismatch de tipo / fallback ausente.

## Correção (somente `src/pages/rh/ProgramacaoFeriasPage.tsx`)

1. **`openPivotCell(ano, mesIdx)`** — trocar filtro por versão robusta que:
   - coage ambos os lados: `String(x.ano_limite) === String(ano)` e `Number(x.mes_limite) === Number(mesIdx)`;
   - se `ano_limite`/`mes_limite` vierem ausentes/null, faz fallback derivando de `dt_limite_saida` (parse do `YYYY-MM-DD`: `ano = s.slice(0,4)`, `mes = Number(s.slice(5,7))`).

2. **`openPivotTotal(ano)`** — mesma lógica, filtrando só por ano (com fallback via `dt_limite_saida`).

3. Extrair helper local `getAnoMesLimite(x)` que devolve `{ ano: string, mes: number }` para reuso nos dois handlers.

Nenhuma outra parte da página muda. Sem mudanças de tipos, API, backend ou modal.

## Verificação

- Clicar `12/2026` (valor 19) → modal deve mostrar "19 períodos".
- Clicar `TOTAL` da linha 2026 → soma dos 12 meses.
- Células com `-` continuam não-clicáveis.

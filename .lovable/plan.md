## Problema
O endpoint `/api/contabil/indicadores/analise?com_ia=true` gera narrativa por IA no backend e leva mais que o timeout padrão de 15s do `contabilApi`, resultando no erro "API contábil não respondeu em 15s".

## Solução
Permitir timeout customizado por chamada no cliente HTTP contábil e usar 90s apenas para a análise de IA (demais chamadas mantêm 15s).

### Passos
1. `src/lib/contabil/contabilApi.ts`
   - Adicionar parâmetro opcional `timeoutMs` em `requestJson` e nos métodos `get/post/...` de `contabilApi`.
   - Se não informado, usa `CONTABIL_TIMEOUT_MS` (15s). Mensagem de erro passa a refletir o timeout efetivo.

2. `src/lib/contabil/indicadoresApi.ts`
   - Em `fetchIndicadoresComAnalise`, passar `{ timeoutMs: 90000 }` para o `get`.

3. `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
   - No botão "Gerar análise", mostrar tooltip/subtítulo "pode levar até 90s" enquanto `analise.isFetching`.

Sem mudanças em backend ou em outras APIs.
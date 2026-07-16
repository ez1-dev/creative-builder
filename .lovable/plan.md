## Corrigir falso-negativo do "contrato do Razão" quando não há lançamentos

**Arquivo:** `src/components/dre-studio/DrillDrawer.tsx`

**Problema**
O backend agora devolve o contrato (`saldo_inicial`, `saldo_final`, `total_debito`, `total_credito`), mas para o período de janeiro/2026 da conta 2178 não há lançamentos (`itens: []`). O heurístico atual (`temContratoRazao`) exige que **pelo menos um item** traga `saldo_anterior`/`mov_debito`/`mov_credito`/`saldo`. Com `itens=[]` isso nunca é verdade, e a UI mostra o banner amarelo "Backend ainda não expõe o contrato do Razão" mesmo com o backend correto.

**Correção**

1. Ajustar `temContratoRazao` (linhas ~255–265): considerar o contrato válido quando o backend devolve `saldo_inicial` e `saldo_final` numéricos. Se houver itens, seguir validando que ao menos um traz os campos por linha; se `itens.length === 0`, aceitar sem exigir os campos por linha.

```ts
const temContratoRazao =
  saldoInicial != null &&
  saldoFinal != null &&
  (itens.length === 0 ||
    itens.some(
      (i) =>
        i?.saldo_anterior !== undefined ||
        i?.mov_debito !== undefined ||
        i?.mov_credito !== undefined ||
        i?.saldo !== undefined,
    ));
```

2. Renderizar estado vazio elegante dentro da tabela quando `temContratoRazao === true` e `itens.length === 0`: manter as linhas SALDO INICIAL/FINAL e inserir entre elas uma linha com colspan cobrindo toda a tabela dizendo "Sem lançamentos no período." (`text-muted-foreground italic text-center py-4`). Isso preserva o Excel/expandir e o rodapé com totais (que continuarão em 0,00).

3. `podeExportar` continua `temContratoRazao && itens.length > 0` — não faz sentido exportar planilha vazia; o botão fica desabilitado com tooltip "Sem lançamentos no período".

**Não faremos**
- Nada de backend, nada de contrato novo, nada em outros drawers.

**Validação**
- Abrir o Razão da conta 2178 em jan/2026: some o banner amarelo; aparece SALDO INICIAL 0,00, linha "Sem lançamentos no período." e SALDO FINAL 0,00; rodapé com totais zerados; botão Excel desabilitado.
- Abrir uma conta com lançamentos: fluxo atual permanece igual.

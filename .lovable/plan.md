## Objetivo
Tornar **Detalhes Impostos** disponível no botão **Trocar drill** em todos os níveis do drill BI Comercial.

## Mudança
- Em `src/lib/bi/comercialDrillCatalog.ts`, adicionar `'DETALHES_IMPOSTOS'` ao final do array `NEXT_DRILLS` para os níveis que hoje não o oferecem:
  - `ACUMULADO`, `MENSAL`, `ESTADO`, `CLIENTE`, `REVENDA`.
  - `PRODUTO` e `NOTA_FISCAL` já incluem.
  - `DETALHES_IMPOSTOS` continua como folha (array vazio).

## Critérios de aceite atendidos
- Botão "Trocar drill" exibe **Detalhes Impostos** em qualquer nível.
- Ao selecionar, o front envia `drill_type = "DETALHES_IMPOSTOS"` (já é o comportamento do hook e da API client).
- Contexto acumulado é preservado pelo `mergeCtx` (já configurado para manter `cd_nf`, `cd_produto`, `anomes_emissao`, `cd_cliente`).
- Tabela e CSV exibem as colunas devolvidas pelo backend (ICMS, IPI, PIS, COFINS, ISS, ICMS ST, DIFAL, Total Impostos) — a renderização é dirigida por `resp.columns`, então não precisa mudança de UI.

## Fora do escopo
- Não altero `useComercialDrillStack`, `ComercialDrillDrawer`, nem `comercialDrillApi.ts` — já estão corretos para esse drill.
- Nenhuma mudança no backend FastAPI.
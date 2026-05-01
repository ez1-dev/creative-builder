## Objetivo

Adicionar `VENTBP` (Vendedor Padrão TBP) e outros campos "padrão" comuns do `E099USU` ao dicionário `src/lib/erpFieldLabels.ts`, eliminando o rótulo `(E099USU.VENTBP)` na coluna **Descrição** de **SGU › Preview por campo**.

## Mudanças

### `src/lib/erpFieldLabels.ts` — bloco `E099USU` em `BY_TABLE`

Adicionar ao final do mapa `E099USU` (após `IDIUSU`):

- `VENTBP` — Vendedor Padrão (TBP)
- `CODFIL` — Filial Padrão
- `CODDEP` — Departamento Padrão
- `CODSEC` — Seção Padrão
- `CODCCU` — Centro de Custo Padrão
- `CODPRJ` — Projeto Padrão
- `CODCPR` — Comprador Padrão
- `CODVEN` — Vendedor Padrão
- `CODREP` — Representante Padrão
- `CODTRA` — Transportadora Padrão
- `CODOPR` — Operador Padrão

No contexto de `E099USU` esses códigos representam o valor padrão associado ao usuário, então o rótulo na tabela é "X Padrão" (sobrepõe o GLOBAL).

## Arquivo afetado

- `src/lib/erpFieldLabels.ts`

## Validação

Reabrir **Gestão SGU › Preview por campo** e confirmar que `VENTBP` agora aparece como **"Vendedor Padrão (TBP)"**. Reportar quaisquer outros códigos remanescentes no formato `(TABELA.CAMPO)`.

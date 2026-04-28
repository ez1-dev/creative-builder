# Backend bug — `/api/contas-pagar-arvore` ignora filtros

> Documento destinado ao time de backend (FastAPI).
> Frontend de referência: `src/pages/ContasPagarPage.tsx` (modo "Árvore de rateio").

## Resumo

A rota `/api/contas-pagar-arvore` (e `/api/export/contas-pagar-arvore`) hoje
**não aplica** vários filtros que a rota equivalente `/api/contas-pagar`
aplica corretamente. Como resultado, ao ativar **"Modo árvore de rateio"** na
tela de Contas a Pagar, a árvore retorna títulos fora do escopo dos filtros
informados pelo usuário.

## Filtros que a rota árvore precisa passar a aplicar

Todos os parâmetros abaixo já são aceitos por `/api/contas-pagar` e devem ser
aplicados de forma idêntica em `/api/contas-pagar-arvore` (e na exportação):

| Parâmetro                                | Tipo            | Significado                                                                 |
|------------------------------------------|-----------------|-----------------------------------------------------------------------------|
| `data_movimento_ini`, `data_movimento_fim` | `YYYY-MM-DD`  | Filtra por `data_ultimo_movimento` (data de pagamento/baixa).               |
| `valor_min`, `valor_max`                 | `number`        | Faixa de `valor_original` do título.                                        |
| `somente_vencidos`                       | `bool`          | Apenas títulos com `status_titulo = 'VENCIDO'`.                             |
| `somente_saldo_aberto`                   | `bool`          | Apenas títulos com `valor_aberto > 0`.                                      |
| `somente_cheques`                        | `bool`          | Apenas títulos do tipo cheque.                                              |
| `incluir_pagos` / `excluir_pagos`        | `bool`          | Mutuamente exclusivos. Mesma semântica de `/api/contas-pagar`.              |

> Os demais filtros (fornecedor, número do título, tipo, filial, centro de
> custo, projeto, status, data de emissão e data de vencimento) também devem
> continuar sendo aplicados — alguns já funcionam, mas vale revisar todos.

## Comportamento esperado

A rota árvore deve aplicar **todos** os filtros **antes** de montar a
hierarquia (TÍTULO → RATEIO). Em outras palavras:

1. Selecionar os títulos com a mesma cláusula `WHERE` usada por
   `/api/contas-pagar`.
2. Para cada título selecionado, anexar suas linhas filhas de `E075RAT`.

Nunca retornar títulos que não passariam no `WHERE` do modo normal.

## Reprodução do bug

1. Abrir `/contas-pagar` no frontend.
2. Marcar **"Modo árvore de rateio"**.
3. Preencher `Data Pagamento Inicial = 2026-04-01` e
   `Data Pagamento Final = 2026-04-30`.
4. Clicar em **Pesquisar**.

**Resultado observado:** retornam títulos cuja `data_ultimo_movimento` está
fora do intervalo informado.

**Resultado esperado:** retornar somente títulos com
`data_ultimo_movimento` entre 2026-04-01 e 2026-04-30 (mesma regra da rota
`/api/contas-pagar`).

## Critérios de aceite

- [ ] `GET /api/contas-pagar-arvore?data_movimento_ini=2026-04-01&data_movimento_fim=2026-04-30`
      retorna apenas títulos com `data_ultimo_movimento` no intervalo.
- [ ] `GET /api/export/contas-pagar-arvore` respeita os mesmos filtros e gera
      o XLSX coerente com a tela.
- [ ] Combinar `data_movimento_*` com `status_titulo=PAGO` continua filtrando
      corretamente.
- [ ] Nenhum filtro existente é quebrado (emissão, vencimento, fornecedor,
      etc. continuam funcionando).

## Referências cruzadas

- Spec original do endpoint: `docs/backend-export-contas-pagar-arvore.md`
- Contrato dos rateios: `docs/backend-contas-centro-custo-projeto.md`

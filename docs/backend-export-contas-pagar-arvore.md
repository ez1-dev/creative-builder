# Backend spec — Contas a Pagar: Modo árvore + Exportação Excel

> Documento destinado ao time de backend (FastAPI). Especificação **definitiva**
> para os endpoints de árvore e exportação. Substitui qualquer documento
> anterior sobre filtros do modo árvore (ex.: `backend-contas-pagar-arvore-filtros.md`,
> agora removido — conteúdo consolidado aqui).
>
> Frontend de referência: `src/pages/ContasPagarPage.tsx`.

## 1. Escopo

Os dois endpoints abaixo **devem aplicar exatamente os mesmos filtros** que
`/api/contas-pagar` aplica no modo normal:

- `GET /api/contas-pagar-arvore` — listagem em árvore (TÍTULO → RATEIO).
- `GET /api/export/contas-pagar-arvore` — exportação XLSX da mesma árvore.

Não pode haver divergência entre o que aparece na tela do modo normal, na tela
do modo árvore e no XLSX exportado quando os filtros são idênticos.

## 2. Query params (todos opcionais — mesmos do modo normal)

| Param                                  | Tipo            | Significado                                                              |
|----------------------------------------|-----------------|--------------------------------------------------------------------------|
| `fornecedor`                           | string          | Nome ou código do fornecedor.                                            |
| `numero_titulo`                        | string          |                                                                          |
| `tipo_titulo`                          | string          | NF, DP, CH, ...                                                          |
| `codigo_filial`                        | string          |                                                                          |
| `centro_custo`                         | string          | Código ou nome.                                                          |
| `numero_projeto` / `projeto`           | string          |                                                                          |
| `status_titulo`                        | enum            | `PAGO` \| `LIQUIDADO` \| `PARCIAL` \| `VENCIDO` \| `A_VENCER` \| `EM_ABERTO`. |
| `data_emissao_ini`, `data_emissao_fim` | `YYYY-MM-DD`    |                                                                          |
| `data_vencimento_ini`, `data_vencimento_fim` | `YYYY-MM-DD` |                                                                          |
| `data_movimento_ini`, `data_movimento_fim`   | `YYYY-MM-DD` | Filtra por `data_ultimo_movimento` (data de pagamento/baixa). Equivale ao filtro **"Data Pagamento"** da tela. |
| `valor_min`, `valor_max`               | number          | Faixa de `valor_original`.                                               |
| `somente_vencidos`                     | bool            |                                                                          |
| `somente_saldo_aberto`                 | bool            |                                                                          |
| `somente_cheques`                      | bool            |                                                                          |
| `incluir_pagos` / `excluir_pagos`      | bool            | Mutuamente exclusivos. Mesma semântica do modo normal.                   |

## 3. Ordem de execução obrigatória

A árvore **NUNCA** pode ser montada antes de aplicar os filtros. A query deve
seguir esta ordem:

1. Montar a CTE `BASE` de Contas a Pagar (mesma usada por `/api/contas-pagar`).
2. Aplicar **TODOS** os filtros acima no `WHERE` da `BASE`, usando exatamente
   a mesma lógica do modo normal.
3. Selecionar apenas os títulos que passaram nos filtros.
4. Só então fazer `LEFT JOIN` com `E075RAT` para anexar as linhas de rateio
   e montar a hierarquia.
5. Títulos sem rateio cadastrado aparecem mesmo assim, marcados com
   `origem_rateio = 'sem rateios cadastrados'`.

> Erro atual conhecido: a árvore está sendo montada **antes** dos filtros,
> retornando títulos fora do escopo da pesquisa. A correção é exatamente
> inverter essa ordem.

## 4. Regra — Status Pago / Liquidado

Quando `status_titulo IN ('PAGO', 'LIQUIDADO')`, considerar título pago se:

```sql
COALESCE(BASE.valor_aberto, 0) <= 0
OR BASE.status_titulo IN ('PAGO', 'LIQUIDADO')
```

Isso garante que o modo árvore retorna o **mesmo conjunto** de títulos pagos
que o modo normal — sem depender exclusivamente da string `status_titulo`
populada pelo ERP.

## 5. Regra — Data Pagamento (`data_movimento_*`)

```sql
CAST(BASE.data_ultimo_movimento AS DATE) >= :data_movimento_ini
CAST(BASE.data_ultimo_movimento AS DATE) <= :data_movimento_fim
```

`data_ultimo_movimento` vem de `MAX(M.DatMov)` em `E501MCP` para o título
(definição já existente no backend). A regra vale tanto para a listagem
quanto para a exportação.

## 6. Exportação Excel

`GET /api/export/contas-pagar-arvore` deve respeitar **exatamente os mesmos
filtros** da listagem `GET /api/contas-pagar-arvore`. Sem exceções.

### Layout XLSX

#### Colunas (nesta ordem)

| # | Cabeçalho       | Origem                            | Observação                            |
|---|-----------------|-----------------------------------|---------------------------------------|
| 1 | Tipo Linha      | `tipo_linha`                      | `TITULO` ou `RATEIO`                  |
| 2 | Nº Título       | `numero_titulo`                   | só na linha-pai                       |
| 3 | Fornecedor      | `nome_fornecedor` (+ código)      | só na linha-pai                       |
| 4 | Vencimento      | `data_vencimento`                 | só na linha-pai                       |
| 5 | Status          | `status_titulo`                   | só na linha-pai                       |
| 6 | Valor Original  | `valor_original`                  | só na linha-pai                       |
| 7 | Valor Aberto    | `valor_aberto`                    | só na linha-pai                       |
| 8 | CCU             | `codigo_centro_custo`             |                                       |
| 9 | Descrição CCU   | `descricao_centro_custo`          |                                       |
|10 | Projeto         | `numero_projeto`                  |                                       |
|11 | Fase            | `codigo_fase_projeto`             |                                       |
|12 | % Rateio        | `percentual_rateio`               | só nas filhas                         |
|13 | Valor Rateado   | `valor_rateado`                   | só nas filhas                         |
|14 | Origem Rateio   | `origem_rateio`                   | `E075RAT` ou `sem rateios cadastrados`|

#### Hierarquia visual

- `outline_level = 1` do openpyxl nas linhas filhas (RATEIO) para colapsar/expandir.
- Linhas-pai com fundo `#F1F5F9` e fonte **bold**.
- Moeda `R$ #,##0.00;[Red](R$ #,##0.00);-`. Percentual `0.00%`.
- `freeze_panes = "A2"`.
- Largura mínima 14 caracteres; 32 para Fornecedor e Descrição CCU.

#### Resposta HTTP

- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="contas_pagar_arvore_<YYYYMMDD_HHMM>.xlsx"`

### Erros

- Endpoint inexistente: `404 Not Found` (o frontend já trata e mostra toast).
- Erro de SQL/parametrização: `500` com `{ "detail": "<mensagem>" }`.

## 7. Critérios de aceite

1. No modo normal, `Status = Pago` retorna títulos pagos/liquidados.
2. No Modo árvore, `Status = Pago` retorna **os mesmos títulos pagos** do modo normal.
3. No Modo árvore, `data_movimento_ini/fim` filtra por `data_ultimo_movimento`.
4. `valor_min` e `valor_max` funcionam no Modo árvore.
5. `somente_vencidos` funciona no Modo árvore.
6. `somente_saldo_aberto` funciona no Modo árvore.
7. `somente_cheques` funciona no Modo árvore.
8. `incluir_pagos` / `excluir_pagos` funcionam no Modo árvore.
9. `/api/export/contas-pagar-arvore` retorna XLSX coerente com a tela
   (mesmos filtros, mesmos títulos, mesmos rateios).
10. Modo árvore não exibe mais aviso de limitação no frontend (já removido).

## 8. Checklist de validação manual

- [ ] Título `975462S-1` retorna **2** linhas filhas (rateios).
- [ ] Soma de `valor_rateado` por título == `valor_original` (tolerância R$ 0,01).
- [ ] Soma de `percentual_rateio` por título ≈ 100% (tolerância 0,01).
- [ ] `?status_titulo=PAGO&data_movimento_ini=2026-04-01&data_movimento_fim=2026-04-30`
      no endpoint árvore retorna o **mesmo conjunto** de títulos que o mesmo
      filtro em `/api/contas-pagar`.
- [ ] Títulos sem rateio aparecem com `sem rateios cadastrados` em Origem Rateio.

## 9. Referências cruzadas

- Contrato dos rateios: `docs/backend-contas-centro-custo-projeto.md`
- Frontend: `src/pages/ContasPagarPage.tsx` (busca `modoArvoreAtivo` e `exportEndpoint`).

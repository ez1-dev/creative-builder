# Backend spec — Exportação Excel da árvore de rateios (Contas a Pagar)

> Documento destinado ao time de backend (FastAPI). O frontend já chama esse
> endpoint quando o usuário ativa **Modo árvore de rateio** em `/contas-pagar`.

## Endpoint

```
GET /api/export/contas-pagar-arvore
```

## Query params (todos opcionais, mesmos do `/api/contas-pagar-arvore`)

- `fornecedor` (string — nome ou código)
- `numero_titulo` (string)
- `tipo_titulo` (string — NF, DP, CH, ...)
- `filial` (string)
- `centro_custo` (string — código ou nome)
- `numero_projeto` / `projeto` (string)
- `status_titulo` (`PAGO` | `PARCIAL` | `VENCIDO` | `A_VENCER` | `EM_ABERTO`)
- `data_emissao_ini`, `data_emissao_fim` (YYYY-MM-DD)
- `data_vencimento_ini`, `data_vencimento_fim` (YYYY-MM-DD)
- `data_movimento_ini`, `data_movimento_fim` (YYYY-MM-DD) — filtra por
  `data_ultimo_movimento` (data de pagamento/baixa do título). Equivale ao
  filtro **"Data Pagamento"** da tela.
- `valor_min`, `valor_max` (number)
- `somente_vencidos`, `somente_saldo_aberto`, `somente_cheques` (bool)
- `incluir_pagos` / `excluir_pagos` (bool, mutuamente exclusivos — mesma
  semântica de `/api/contas-pagar`)
- demais filtros já aceitos pelo endpoint de listagem da árvore

> **IMPORTANTE:** o endpoint árvore deve aplicar **EXATAMENTE os mesmos
> filtros** que `/api/contas-pagar` antes de montar a hierarquia. Filtros
> não reconhecidos hoje (notadamente `data_movimento_*`, `valor_*`,
> `somente_*` e `incluir_pagos`/`excluir_pagos`) estão fazendo a árvore
> retornar registros fora do escopo. Ver
> `docs/backend-contas-pagar-arvore-filtros.md` para o ticket de bug.

## Fonte de dados

Reutilizar a mesma query de `/api/contas-pagar-arvore`:

- Títulos a pagar (E060IPC) com `LEFT JOIN` em projeto/fase/CCU conforme
  `docs/backend-contas-centro-custo-projeto.md`.
- Linhas-filhas via `E075RAT` (rateios) anexadas a cada título.
- Títulos sem rateio cadastrado devem aparecer mesmo assim, marcados na coluna
  **Origem Rateio** com o texto literal `sem rateios cadastrados`.

## Layout do arquivo XLSX

### Colunas (nesta ordem)

| # | Cabeçalho        | Origem (campo)                  | Observação                    |
|---|------------------|----------------------------------|-------------------------------|
| 1 | Tipo Linha       | `tipo_linha`                     | `TITULO` ou `RATEIO`          |
| 2 | Nº Título        | `numero_titulo`                  | só na linha-pai               |
| 3 | Fornecedor       | `nome_fornecedor` (+ código)     | só na linha-pai               |
| 4 | Vencimento       | `data_vencimento`                | só na linha-pai               |
| 5 | Status           | `status_titulo`                  | só na linha-pai               |
| 6 | Valor Original   | `valor_original`                 | só na linha-pai               |
| 7 | Valor Aberto     | `valor_aberto`                   | só na linha-pai               |
| 8 | CCU              | `codigo_centro_custo`            |                               |
| 9 | Descrição CCU    | `descricao_centro_custo`         |                               |
|10 | Projeto          | `numero_projeto`                 |                               |
|11 | Fase             | `codigo_fase_projeto`            |                               |
|12 | % Rateio         | `percentual_rateio`              | só nas filhas                 |
|13 | Valor Rateado    | `valor_rateado`                  | só nas filhas                 |
|14 | Origem Rateio    | `origem_rateio`                  | `E075RAT` ou `sem rateios cadastrados` |

### Hierarquia visual

- Usar `outline_level = 1` do openpyxl nas linhas filhas (RATEIO) para o usuário
  conseguir colapsar/expandir grupos no Excel.
- Linhas-pai (TITULO) com **fundo cinza claro** (`#F1F5F9`) e fonte **bold**.
- Formatação numérica: moeda `R$ #,##0.00;[Red](R$ #,##0.00);-` para valores;
  percentual `0.00%` para `% Rateio`.
- Congelar a primeira linha (`freeze_panes = "A2"`).
- Largura mínima sugerida: 14 caracteres por coluna; 32 para Fornecedor e
  Descrição CCU.

### Resposta HTTP

- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="contas_pagar_arvore_<YYYYMMDD_HHMM>.xlsx"`

## Erros e contrato

- Enquanto o endpoint não existir, retornar `404 Not Found` (o frontend já
  detecta e mostra um toast amigável apontando para este documento).
- Em caso de erro de SQL/parametrização, devolver `500` com JSON
  `{ "detail": "<mensagem>" }` — o frontend reaproveita o `errHaystack`.

## Checklist de validação

- [ ] Título 975462S-1 retorna **2** linhas filhas (rateios) no Excel.
- [ ] Soma de `valor_rateado` por título == `valor_original` do título
      (tolerância de R$ 0,01).
- [ ] Soma de `percentual_rateio` por título ≈ 100% (tolerância 0,01).
- [ ] Filtros aplicados na tela são respeitados no arquivo gerado.
- [ ] Filtrar `data_pagamento_ini`/`data_pagamento_fim` (que o frontend envia
      como `data_movimento_ini`/`data_movimento_fim`) no modo árvore retorna
      apenas títulos cuja `data_ultimo_movimento` está no intervalo —
      mesma regra do modo normal.
- [ ] Títulos sem rateio aparecem com `sem rateios cadastrados` na coluna
      Origem Rateio.

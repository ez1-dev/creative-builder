# Backend — BI Faturamento (Validação)

Tela frontend: `/bi/faturamento-validacao`
Arquivo frontend: `src/pages/bi/FaturamentoValidacaoPage.tsx`
Camada de dados: `src/lib/bi/faturamentoValidacao.ts`

## Fonte de dados

**SOMENTE** ler `public.bi_faturamento` no Cloud (Supabase). **NÃO** consultar o ERP.
A tela é apenas de validação dos dados já carregados pelo ETL.

## Filtros (query string)

Todos opcionais. Filtros multi-valor aceitam lista separada por vírgula (ex.: `cd_filial=1,2,3`).

| param | tipo | descrição |
|---|---|---|
| `anomes_ini` | string `YYYYMM` | filtro `anomes_emissao >= anomes_ini` |
| `anomes_fim` | string `YYYYMM` | filtro `anomes_emissao <= anomes_fim` |
| `cd_tp_movimento` | csv string | `cd_tp_movimento IN (...)` |
| `cd_origem` | csv string | `cd_origem IN (...)` |
| `cd_empresa` | csv string | `cd_empresa IN (...)` |
| `cd_filial` | csv string | `cd_filial IN (...)` |
| `cd_tns` | csv string | `cd_tns IN (...)` |
| `cd_centro_custos_3` | csv string | `cd_centro_custos_3 IN (...)` |
| `cd_nf` | csv string | `cd_nf IN (...)` |
| `fonte_acao` | csv string | `fonte_acao IN (...)`. Valor especial `SEM_FONTE` traduz para `fonte_acao IS NULL` (pode ser combinado, ex.: `fonte_acao=faturamento,SEM_FONTE`). |


## Endpoints

### `GET /api/bi/faturamento/resumo`

```json
{
  "qtd_linhas": 0,
  "vl_bruto": 0.0,
  "vl_total": 0.0,
  "vl_devolucao": 0.0,
  "vl_icms": 0.0,
  "vl_pis": 0.0,
  "vl_cofins": 0.0
}
```

### `GET /api/bi/faturamento/por-movimento`

Agrupar por `anomes_emissao, fonte_acao, cd_tp_movimento, cd_origem`. Retornar array.

```json
[
  {
    "anomes_emissao": "202601",
    "fonte_acao": "faturamento",
    "cd_tp_movimento": "S",
    "cd_origem": "PROP",
    "qtd_linhas": 0,
    "vl_bruto": 0.0,
    "vl_total": 0.0,
    "vl_devolucao": 0.0,
    "vl_icms": 0.0,
    "vl_pis": 0.0,
    "vl_cofins": 0.0
  }
]
```


### `GET /api/bi/faturamento/por-tns`

Agrupar por `cd_tns, cd_natureza`. Retornar array.

```json
[
  {
    "cd_tns": "511",
    "cd_natureza": "1102",
    "qtd_linhas": 0,
    "vl_total": 0.0,
    "vl_devolucao": 0.0
  }
]
```

### `GET /api/bi/faturamento/detalhes`

Paginação server-side. Parâmetros extras: `page` (1-based, default 1), `page_size` (default 50, máx 500).

```json
{
  "rows": [
    {
      "cd_tp_movimento": "S",
      "cd_origem": "PROP",
      "cd_empresa": "1",
      "cd_filial": "1",
      "cd_nf": "12345",
      "cd_serie": "1",
      "dt_emissao": "2026-01-15",
      "anomes_emissao": "202601",
      "cd_tns": "511",
      "cd_cliente": "1234",
      "cd_centro_custos_3": "001",
      "fonte_acao": "faturamento",
      "vl_bruto": 0.0,
      "vl_total": 0.0,
      "vl_devolucao": 0.0,
      "created_at": "2026-06-01T12:00:00Z"

    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 0
}
```

`created_at` vem da coluna `atualizado_em` da tabela `bi_faturamento`.

## Observações

- Todos os campos numéricos devem ser retornados como `number` (não string).
- Quando não houver dados, retornar resumo zerado e arrays vazios (não 404).
- A query deve usar `bi_faturamento` exclusivamente — não fazer JOIN com tabelas do ERP.
- A tela **não usa IA para nada** — título é estático (`"Validação BI Faturamento"`). Qualquer falha em `/api/bi/faturamento/*` exibe um `ErrorState` localizado por seção e não derruba o restante da página. Se um dia for adicionada geração automática de título, envolver com `safeTitle()` de `src/lib/safeTitle.ts`.

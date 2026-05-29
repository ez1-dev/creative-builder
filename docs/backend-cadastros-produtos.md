# Backend — Consulta de Produtos (`/api/cadastros/produtos`)

Contrato dos endpoints consumidos pela tela `/cadastros/produtos` do frontend (componente `ConsultaProdutos`).

Todas as chamadas exigem `Authorization: Bearer <token>` e devem aceitar o header `ngrok-skip-browser-warning: true`.

## 1) Listagem de produtos

`GET /api/cadastros/produtos`

### Query params

| Nome | Tipo | Default | Descrição |
|---|---|---|---|
| `codemp` | number | — | Código da empresa (opcional). |
| `codori` | string | — | Origem do produto (filtro exato). |
| `codfam` | string | — | Família do produto (filtro exato). |
| `codpro` | string | — | Código do produto (filtro `like` ou exato). |
| `despro` | string | — | Trecho da descrição (filtro `like`, case-insensitive). |
| `tippro` | string | — | Tipo do produto (ex.: `PA`, `MP`, `SA`). |
| `somente_ativos` | boolean | `true` | Se `true`, filtra `SITPRO = 'A'`. |
| `incluir_derivacoes` | boolean | `false` | Se `true`, faz join com `E075DER` e retorna uma linha por derivação ativa. |
| `pagina` | number | `1` | Página 1-indexada. |
| `tamanho_pagina` | number | `100` | Tamanho da página (máx. recomendado 1000). |

### Exemplo

```
GET /api/cadastros/produtos?codori=210&codfam=BR-CHA&somente_ativos=true&pagina=1&tamanho_pagina=100
```

### Resposta

```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 0,
  "total_paginas": 1,
  "filtros": { },
  "dados": [
    {
      "codigo_produto": "string",
      "descricao_produto": "string",
      "codigo_origem": "string",
      "descricao_origem": "string",
      "codigo_familia": "string",
      "descricao_familia": "string",
      "unidade_medida": "string",
      "tipo_produto": "string",
      "situacao": "A",
      "qtd_derivacoes_ativas": 0,
      "codigo_derivacao": "string",
      "descricao_derivacao": "string",
      "situacao_derivacao": "A"
    }
  ]
}
```

Campos `codigo_derivacao`, `descricao_derivacao` e `situacao_derivacao` só vêm preenchidos quando `incluir_derivacoes=true`.

## 2) Filtros iniciais (combo único — usado na abertura da tela)

`GET /api/cadastros/produtos/filtros?somente_ativos=true`

Endpoint **preferencial** consumido pela tela ao abrir. Retorna num único payload as listas de origens e famílias que possuem produtos (filtrando ativos quando `somente_ativos=true`).

### Resposta

```json
{
  "codemp": 1,
  "somente_ativos": true,
  "origens": [
    {
      "codigo_origem": "210",
      "descricao_origem": "GENIUS",
      "quantidade_produtos": 120,
      "value": "210",
      "label": "210 - GENIUS"
    }
  ],
  "familias": [
    {
      "codigo_familia": "BR-CHA",
      "descricao_familia": "Barras / Chapas",
      "quantidade_produtos": 80,
      "value": "BR-CHA",
      "label": "BR-CHA - Barras / Chapas"
    }
  ]
}
```

## 3) Combo de origens (legado)

`GET /api/cadastros/produtos/origens`

Mantido por compatibilidade, mas **não é mais usado pela tela na abertura** (substituído por `/filtros`).

### Resposta

```json
[
  { "codigo": "210", "descricao": "Importado" }
]
```

## 4) Combo de famílias

`GET /api/cadastros/produtos/familias?somente_ativos=true`
`GET /api/cadastros/produtos/familias?codori=210&somente_ativos=true`

Usado apenas quando o usuário **muda a origem** na tela. Retorna a lista distinta de famílias, restringindo pela origem quando `codori` é informado.



### Resposta

```json
[
  { "codigo": "BR-CHA", "descricao": "Chapas Brasileiras" }
]
```

## Tabelas Senior sugeridas

- `E075PRO` — produto (`CODPRO`, `DESPRO`, `CODORI`, `CODFAM`, `TIPPRO`, `SITPRO`, `CODUNI`).
- `E076ORI` / `E075FAM` (ou equivalentes locais) — descrições de origem e família.
- `E075DER` — derivações ativas (`CODPRO`, `CODDER`, `DESDER`, `SITDER`).
- `E075UNI` — unidade de medida.

## Estados de erro esperados

- `401` quando token ausente/expirado.
- `400` com `{ "detail": "<mensagem>" }` para parâmetros inválidos — o frontend exibe a mensagem como erro da tela.
- `500` com `{ "detail": "<mensagem>" }` para falhas internas.

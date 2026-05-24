# Carga de Produção — Dashboard BI (`/producao/carga/dashboard`)

A tela consome **`GET /api/producao/carga/centros`** e exibe KPIs, gráficos, tabela e insights derivados da própria resposta. Tudo que o endpoint já fornece está no ar com dado real.

## Campos faltantes (placeholders na tela)

Os blocos abaixo estão renderizados com placeholder ("—" + badge "aguardando API") ou com **mock visível** ("Dados de exemplo"). Para sair do mock, o backend precisa expor:

### 1. Capacidade e ocupação por recurso

Sugestão de extensão em `resumo` e em cada item de `dados[]`:

```json
{
  "resumo": {
    "capacidade_disponivel_min": 683520,
    "ocupacao_media_pct": 75.0,
    "centros_criticos": 5,        // recursos com ocupacao > 90%
    "obras_em_producao": 14
  },
  "dados": [
    {
      "codcre": "3020",
      "capacidade_disponivel_min": 78720,
      "ocupacao_pct": 92.4
    }
  ]
}
```

Definição de "capacidade": jornada padrão do recurso (turnos × horas × dias úteis no período) menos paradas previstas — fórmula a definir com PCP.

### 2. Comparativo "vs mês anterior"

Para mostrar setas de variação nos KPIs (▲ 12,4%):

```json
"comparativo_anterior": {
  "qtd_ops": 1111,
  "carga_prevista_min": 471560,
  "capacidade_disponivel_min": 650200,
  "ocupacao_media_pct": 71.4,
  "centros_criticos": 3,
  "obras_em_producao": 14
}
```

Backend calcula o mês imediatamente anterior ao `data_ini`/`data_fim` recebidos.

### 3. Ocupação por dia da semana — heatmap

Endpoint novo: **`GET /api/producao/carga/ocupacao-semanal`** (mesmos filtros).

```json
{
  "dias": ["seg","ter","qua","qui","sex","sab"],
  "recursos": [
    { "codcre": "3020", "descre": "E-GUILHOTINA", "ocupacao": [93,95,94,92,92,76] },
    ...
  ]
}
```

### 4. Fila de OPs por situação

**Status atual:** o frontend hoje agrega no client chamando `GET /api/producao/carga/detalhe` com `tamanho_pagina=5000` e ignorando o filtro `situacoes`, depois deduplicando por `(codori, numop)` e contando por `sitop`. Funciona, mas paga o custo de baixar até 5k linhas só pra contar OPs distintas, e fica "amostra parcial" quando `total_registros > 5000`.

**Pedido:** endpoint agregado **`GET /api/producao/carga/situacoes`** (mesmos filtros do `/centros`, exceto `situacoes` que deve ser ignorado internamente pra devolver todas).

```json
{
  "total": 1248,
  "por_situacao": [
    { "codigo": "A", "descricao": "Aberta", "qtd": 512 },
    { "codigo": "C", "descricao": "Confirmada", "qtd": 356 },
    { "codigo": "F", "descricao": "Finalizada", "qtd": 198 },
    { "codigo": "L", "descricao": "Liberada", "qtd": 118 },
    { "codigo": "S", "descricao": "Suspensa", "qtd": 64 }
  ]
}
```

### 5. Obras com risco de atraso (opcional)

Para alimentar o card "Obras em produção" e o painel de Insights:

```json
"obras_risco": [
  { "codori": "594", "descricao": "Terminal Exportador de Santos", "ocupacao_critica": true },
  { "codori": "640", "descricao": "TGSC Graneis SC", "ocupacao_critica": true }
]
```

## Notas de implementação no frontend

- Já existe `OrigemMapeamento` (`PADRAO_API` | `REGRA_API` | `SUPABASE`) — quando vier `ocupacao_pct` por linha o dashboard passa a colorir top-recursos por **ocupação real** (hoje colore por **quartil de carga**).
- Filtros já cobrem: período, unidade, tipo de recurso, centro, operação, origem, situações e flag "considerar carga".
- A tabela de centros mais demandados aceita até 15 linhas; ajustar quando o backend permitir paginação dedicada.

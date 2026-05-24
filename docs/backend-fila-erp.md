# FastAPI — Endpoint da fila do ERP para Programação

> **Escopo**: a FastAPI **somente lê** o ERP Senior. Não acessa Supabase. Não precisa de `SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY` para este fluxo.

A Edge Function `programacao-sync-fila` no Lovable Cloud consome este endpoint a cada 15 minutos (cron) e sob demanda (botão "Atualizar fila do ERP" na tela `/producao/programacao`). Ela popula a tabela `bi_ops_fila` no Cloud.

## Contrato

```
GET /api/producao/programacao/fila-erp
```

### Query params (todos opcionais, exceto onde indicado)

| Nome              | Tipo    | Default | Descrição |
|-------------------|---------|---------|-----------|
| `codemp`          | int     | —       | Empresa Senior |
| `situacoes`       | string  | `A,L`   | Lista CSV de situações de OP a incluir |
| `unidade_negocio` | string  | —       | Filtro por unidade de negócio |
| `codcre`          | string  | —       | Filtro por centro de recurso |
| `limit`           | int     | 5000    | Máximo de linhas a retornar |

### Headers aceitos

- `ngrok-skip-browser-warning: true` (a Edge Function envia)

### Response (200)

```json
{
  "dados": [
    {
      "codemp": 1,
      "numorp": "12345",
      "codori": "001",
      "codpro": "PRD-001",
      "descricao_produto": "Painel 2m",
      "codcre": "C100",
      "descre": "Solda 01",
      "codopr": "10",
      "descricao_operacao": "Soldagem MIG",
      "tipo_recurso": "MAQUINA",
      "unidade_negocio": "GENIUS",
      "situacao": "A",
      "quantidade_prevista": 100,
      "tempo_previsto_min": 240,
      "prioridade": 5,
      "data_geracao_op": "2026-05-20"
    }
  ],
  "total_registros": 1
}
```

### Regras do ERP

- Retornar a fila **completa** dentro do filtro (snapshot). A Edge Function faz reconciliação: OPs que não vierem mais nesta resposta são **removidas** de `bi_ops_fila`.
- `numorp` pode ser número ou string — a Edge Function converte para string.
- `tempo_previsto_min` é o tempo total da operação em minutos (ex.: `tempo_unitario_min * quantidade_prevista`, já calculado no ERP).
- Para `tipo_recurso`, sugerimos derivar de uma classificação fixa por `codcre` ou da tabela `producao_recurso_unidade` no Cloud (se o backend já tiver leitura dela). Se não, deixar `null` é aceitável.

### O que **NÃO** fazer

- ❌ Não escrever em `bi_ops_fila`, `programacao_*` nem em qualquer tabela do Cloud.
- ❌ Não validar token Supabase nem ler service role.
- ❌ Não chamar endpoints que dependam de Supabase.

## Outros endpoints fora deste escopo

O ETL atual de **compras** e **recebimentos** (que escreve em `bi_compras` / `bi_recebimentos` via service role) continua como está — descrito em `docs/backend-etl-bi.md`. Esta separação só afeta o módulo de Programação.

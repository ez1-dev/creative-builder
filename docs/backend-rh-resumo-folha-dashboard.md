# /api/rh/resumo-folha/dashboard

Endpoint agregado consumido pela tela `01 — Resumo Folha`.

## Request

`GET /api/rh/resumo-folha/dashboard`

Query params (todos opcionais exceto os de competência):

| Param | Formato | Obrigatório |
|-------|---------|-------------|
| `anomes_ini` | `YYYYMM` (ex.: `202601`) | sim |
| `anomes_fim` | `YYYYMM` (ex.: `202606`) | sim |
| `filial` | string | não |
| `matricula` | string (matrícula ou trecho do nome) | não |

Autenticação: Bearer Token do usuário logado (mesmo cliente das demais rotas `/api/*`).

## Response

```json
{
  "kpis": {
    "provento": 1234567.89,
    "desconto": 234567.12,
    "total_liquido": 1000000.77,
    "custo_total": 1500000.00,
    "beneficios": 80000.00,
    "inss_total": 150000.00,
    "hora_extra": 50000.00,
    "provisoes": 120000.00,
    "custo_ferias": 90000.00,
    "rescisoes": 20000.00,
    "fgts": 110000.00
  },
  "proventos_vantagens": [
    { "codigo": "001", "descricao": "Salário Base", "valor": 800000.00 }
  ],
  "descontos": [
    { "codigo": "601", "descricao": "INSS", "valor": 150000.00 }
  ],
  "filiais": [
    {
      "filial": "Matriz",
      "salario_base": 500000, "custo_total": 700000,
      "qtd_horas": 16000, "custo_hora_extra": 12000, "qtd_hora_extra": 300,
      "liquido": 400000, "fgts": 50000, "beneficios": 30000,
      "inss": 70000, "custo_ferias": 25000, "provisoes": 40000
    }
  ],
  "tipos_evento": [
    { "tipo": "PROVENTO", "valor": 800000 },
    { "tipo": "DESCONTO", "valor": 230000 }
  ],
  "mensal": [
    { "competencia": "202601", "custo_hora_extra": 8000, "custo_mensal": 250000 }
  ]
}
```

`mensal` é opcional — se ausente, o frontend oculta os gráficos de série mensal.

## Erros tratados pelo frontend

- `404`, `405`, `501` → o frontend mostra: *"Endpoint de dashboard da folha ainda não disponível."* (sem zerar cards).
- Outros erros → banner vermelho com a mensagem.

## Observações

- Os valores aceitam números em `number` ou string pt-BR/en-US (o frontend normaliza via `toNum`).
- Aliases tolerados em `kpis`: `liquido` ↔ `total_liquido`, `inss` ↔ `inss_total`.
- Aliases tolerados em `filiais[]`: `custoHE`/`custo_he`, `qtdHE`/`qtd_he`, `benef`/`va` etc.

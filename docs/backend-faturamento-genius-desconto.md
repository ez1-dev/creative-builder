# Backend — Faturamento Genius: incluir `valor_desconto` no `fat_liquido`

> ⚠️ **Patch atualizado em `docs/backend-faturamento-genius-desconto-PATCH.md`.**
> A view `dbo.USU_VMBRUTANFE` (já consumida pelo backend) **expõe `USU_VLRDSC`
> agregado** — não é necessário ir até `E140IPV.VLRDSC`. O documento abaixo
> permanece como contexto histórico; siga o PATCH para aplicar a correção.

## Contexto

O frontend (`/faturamento-genius`) compara os KPIs com os **targets oficiais do
relatório Genius** (Jan–Abr/2026, ver `mem://features/faturamento-genius-targets`).

Hoje o card "Fat. Líquido" calcula:

```
fat_liquido = valor_total − valor_devolucao − |valor_impostos|
```

Para **202603 / GENIUS** isso dá **R$ 163.412**, enquanto o relatório oficial
apresenta **R$ 161.674** — diferença de ≈ **R$ 1.738** que corresponde a
**descontos comerciais** (desconto incondicional concedido em nota).

A fórmula correta do Genius é:

```
fat_liquido = valor_total − valor_devolucao − |valor_impostos| − valor_desconto
```

## Mudança esperada no backend (FastAPI)

### Endpoints afetados

- `GET /api/faturamento-genius` (detalhe)
- `GET /api/faturamento-genius-dashboard` (agregado)

### 1. Adicionar coluna `valor_desconto` na consulta detalhada

Em `E140NFE` (cabeçalho) ou `E140IPV` (item) somar o desconto incondicional.
Nomes prováveis no Senior:

- `IPV.VLRDSC` — desconto unitário do item
- `NFE.VLRDSC` — desconto total da nota
- `IPV.VLRDSCITE` ou `IPV.PERDSC` (se for percentual) — variantes a confirmar
  com o DBA conforme a versão.

Pseudo-SQL (ajustar conforme a fonte real de faturamento usada hoje):

```sql
SELECT
  ...,
  ISNULL(IPV.VLRDSC, 0)        AS valor_desconto,
  ISNULL(IPV.VLRICMS, 0)       AS valor_icms,
  ISNULL(IPV.VLRIPI, 0)        AS valor_ipi,
  ISNULL(IPV.VLRPIS, 0)        AS valor_pis,
  ISNULL(IPV.VLRCOFINS, 0)     AS valor_cofins,
  ...
FROM dbo.E140IPV IPV
JOIN dbo.E140NFE NFE ON NFE.NUMNFV = IPV.NUMNFV AND NFE.SERNFV = IPV.SERNFV
...
```

Cada linha do detalhe deve devolver um campo numérico
**`valor_desconto`** (default `0`).

### 2. Ajustar o agregado `kpis` e os agrupamentos

Tanto em `kpis` quanto em `por_revenda`, `por_origem`, `por_anomes`,
`por_cliente`, `por_produto`, etc., somar `valor_desconto` da mesma forma que
hoje se soma `valor_devolucao` e `valor_impostos`.

Recalcular o `fat_liquido` em cada bucket:

```python
fat_liquido = valor_total - valor_devolucao - abs(valor_impostos) - valor_desconto
margem_bruta = fat_liquido - valor_custo
margem_percentual = (margem_bruta / fat_liquido * 100) if fat_liquido > 0 else 0
```

### 3. Schema de resposta (acrescentar campo)

```json
{
  "kpis": {
    "valor_total": 191603,
    "valor_devolucao": 821,
    "valor_impostos": -27370,
    "valor_desconto": 1738,        // NOVO
    "fat_liquido": 161674,         // já refletindo o desconto
    ...
  },
  "por_revenda": [
    {
      "revenda": "GENIUS",
      "valor_total": 191603,
      "valor_desconto": 1738,      // NOVO
      ...
    }
  ],
  "dados": [
    {
      "numero_nf": "...",
      "valor_total": ...,
      "valor_desconto": 12.34,     // NOVO por linha
      ...
    }
  ]
}
```

## Validação (QA do backend)

Para o filtro `revenda = 'GENIUS'`, mês a mês, o `fat_liquido` retornado deve
casar **exatamente** com a tabela oficial:

| anomes  | fat       | dev   | impostos  | desconto (esperado) | fat_liq    |
|---------|----------:|------:|----------:|--------------------:|-----------:|
| 202601  | 378.245   | 4.119 | -49.165   | -652  *(verificar)* | 325.613    |
| 202602  | 125.245   | 1.826 | -24.627   | 7.516 *(verificar)* | 91.276     |
| 202603  | 191.603   | 821   | -27.370   | **1.738**           | **161.674**|
| 202604  | 98.959    | 2.114 | -19.436   | 2.110 *(verificar)* | 75.299     |

> Os valores de "desconto" acima são **deduzidos** da diferença entre nossa
> fórmula atual e o `fat_liq` oficial. O DBA deve confirmar os valores reais
> consultando `IPV.VLRDSC` (ou equivalente) por mês para a revenda GENIUS.
> Se houver divergência, pode existir outro componente (ex.: frete que reduz
> base, abatimento, comissão na NF) que também precisa entrar na conta.

## Compatibilidade com o frontend

O frontend (`src/pages/FaturamentoGeniusPage.tsx`) já foi preparado para:

1. Usar `dashboard.kpis.fat_liquido` quando o backend devolver — a mudança é
   **transparente** assim que o backend recalcular esse campo com o desconto.
2. Ler `valor_desconto` por linha (helper `kpisFromPorRevenda`) — quando o
   campo passar a existir, basta atualizar a fórmula local para subtrair
   `valor_desconto` também (ver TODO em `kpisFromPorRevenda` e `computeKpis`).

Após o backend publicar, basta atualizar o frontend trocando:

```ts
const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos);
```

por:

```ts
const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos) - (valor_desconto ?? 0);
```

em `computeKpis` (linha ~264) e `kpisFromPorRevenda` (linha ~310) e
`subtractOutros` (linha ~298) de `src/pages/FaturamentoGeniusPage.tsx`, e
estender os tipos/testes correspondentes.

## Checklist para o time backend

- [ ] Identificar coluna(s) de desconto na fonte de faturamento atual
      (`USU_VMBRUTANFE` ou equivalente).
- [ ] Adicionar `valor_desconto` ao SELECT do detalhe.
- [ ] Somar `valor_desconto` em `kpis` e em todos os agrupamentos
      (`por_revenda`, `por_origem`, `por_anomes`, `por_cliente`, `por_produto`).
- [ ] Recalcular `fat_liquido`, `margem_bruta`, `margem_percentual` incluindo
      o desconto.
- [ ] Validar com os 4 meses oficiais (Jan–Abr/2026) para revenda GENIUS.
- [ ] Comunicar ao frontend para ativar a fórmula com `valor_desconto`.

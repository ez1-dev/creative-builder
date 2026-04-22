

## Adicionar bloco "Status OP Genius" no topo da tela

### Escopo
Inserir, **acima da grade atual de 9 KPIs**, um bloco visual destacado chamado **"Status OP Genius"** que resume em um único cartão amplo a saúde da operação Genius no período filtrado. Não substitui os 9 KPIs — complementa, aparecendo só quando há dados.

### Visual

```text
┌────────────────────────────────────────────────────────────────────────┐
│  STATUS OP GENIUS · período 2026-03-23 → 2026-04-22                    │
│                                                                        │
│   12 OPs ativas no período                                             │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ ████████████░░░░░░░░░░░░░░░░  5 em andamento (42%)           │     │
│   │ ░░░░░░░░░░░░████████████████  7 finalizadas (58%)            │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│   ●  5 em andamento     ●  7 finalizadas     ⚠ 3 com discrepância      │
└────────────────────────────────────────────────────────────────────────┘
```

- Card largo full-width (`Card` do shadcn já em uso), borda esquerda azul (`border-l-4 border-blue-600`).
- Título "Status OP Genius" + subtítulo com o intervalo de datas filtrado.
- **Total de OPs ativas** em destaque tipográfico (texto grande).
- **Barra de proporção horizontal** (duas faixas: azul = em andamento, cinza-slate = finalizadas) com percentuais inline.
- Linha inferior com 3 chips: em andamento (azul), finalizadas (cinza), com discrepância (vermelho — derivado de `total_discrepancias`/`ops_total`).
- Quando `ops_em_andamento + ops_finalizadas == 0`, o bloco não renderiza (evita card vazio).

### Arquivo a editar
- **`src/pages/AuditoriaApontamentoGeniusPage.tsx`** — único arquivo. Adicionar componente local `StatusOpGeniusCard` (mesmo arquivo, abaixo do componente principal ou inline) e renderizá-lo logo antes do grid `lg:grid-cols-9` de KPIs, dentro do bloco `{atualizarKpisApontGenius && (...)}`.

Dados consumidos (já presentes em `atualizarKpisApontGenius`):
- `ops_em_andamento`
- `ops_finalizadas`
- `total_discrepancias`
- `total_registros`

Cálculos no card:
- `total_ops = ops_em_andamento + ops_finalizadas`
- `pct_andamento = total_ops ? (ops_em_andamento / total_ops) * 100 : 0`
- `pct_finalizadas = 100 - pct_andamento`

Filtro de datas exibido: `filters.data_ini` → `filters.data_fim` formatados com `formatDate`.

### Fora de escopo
- Não muda backend, contrato, filtros nem coluna `Status OP` da tabela.
- Não altera os 9 KPIs existentes.
- Não cria novo arquivo, hook ou componente compartilhado.

### Resultado esperado
Ao abrir `/auditoria-apontamento-genius` com dados retornados, o usuário vê primeiro um cartão wide "Status OP Genius" com a fatia visual de andamento × finalizadas + alerta de discrepâncias, e só depois a régua tradicional de 9 KPIs e a tabela.


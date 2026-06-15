# DRE Mensal — Matriz Anual

Hoje `src/pages/bi/contabilidade/DrePage.tsx` chama `GET /api/bi/contabilidade/dre` (FastAPI) e renderiza uma única coluna acumulada de Realizado/Orçado. O pedido é migrar a tabela "Demonstração do Resultado" para um formato matriz mensal alimentado por uma RPC no Lovable Cloud.

## 1. Backend (Lovable Cloud)

Criar RPC `public.bi_dre_matriz_anual(p_ano int, p_unidade_negocio text default null)` que:

- Lê a estrutura ordenada de `bi_dre_estrutura` (ordem, mascara, descricao, totalizadora, sinal, nivel).
- Junta `bi_vm_lanc_contabil` (realizado) via `bi_dre_mascara` (de→para por `cd_conta` e opcionalmente `unidade_negocio`).
- Junta `bi_vm_orc_dre` (orçado) direto por `mascara`.
- Aplica filtros: `extract(year from to_date(anomes_referente::text,'YYYYMM')) = p_ano` e `unidade_negocio = p_unidade_negocio` quando informado.
- Pivota por mês (jan…dez) e calcula totais do ano.
- Calcula A.V. (Análise Vertical) por mês e total = `linha / receita_liquida_do_mes` * 100 (linha base = máscara/descrição configurada como "RECEITA LÍQUIDA" na estrutura).
- Aplica `sinal` para linhas de despesa.

Retorno (uma linha por item da estrutura, ordenado por `ordem`):

```text
mascara text, descricao text, totalizadora bool, nivel int,
jan_realizado numeric, jan_av numeric, jan_orcado numeric,
fev_realizado numeric, fev_av numeric, fev_orcado numeric,
... (mar, abr, mai, jun, jul, ago, set, out, nov, dez)
total_realizado numeric, total_av numeric, total_orcado numeric
```

Permissões: `GRANT EXECUTE ... TO authenticated`. `SECURITY DEFINER` + `SET search_path = public`.

## 2. Frontend — `src/pages/bi/contabilidade/DrePage.tsx`

- Substituir o filtro "Competência inicial/final (AAAAMM)" por **Ano** (number input, default ano atual). Manter Unidade, Empresa, Filial, Centro de custo (Empresa/Filial/CC podem ficar visualmente mas a RPC só usa `p_ano` e `p_unidade_negocio` — outros filtros ficam desabilitados ou removidos; vou **remover** para não confundir).
- Trocar `api.get('/api/bi/contabilidade/dre', …)` por:
  ```ts
  supabase.rpc('bi_dre_matriz_anual', {
    p_ano: anoSelecionado,
    p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
  })
  ```
- Tipar a linha com os 39 campos mensais + 3 totais.
- KPIs (Receita Bruta, Lucro Bruto, EBITDA, Lucro Líquido) passam a ser derivados do `total_realizado` das linhas correspondentes (lookup por descrição/máscara) — gráficos `series.*` e `composicao` são removidos por enquanto (a RPC nova não fornece), simplificando a página para o pedido atual.

### Nova tabela matriz

- Wrapper `div` com `overflow-x-auto max-h-[70vh] overflow-y-auto`.
- `<table>` com `border-collapse: separate; border-spacing: 0` para permitir sticky.
- Cabeçalho com **duas linhas** (`<thead>` com `sticky top-0 z-30`):
  - Linha 1: `Máscara` (rowSpan 2, sticky left) | `Janeiro` colSpan 3 | `Fevereiro` colSpan 3 | … | `Dezembro` colSpan 3 | `TOTAL` colSpan 3.
  - Linha 2: para cada mês/total → `Realizado`, `A.V.`, `Orçado`.
- Primeira coluna (`Máscara` e células) `sticky left-0 z-20 bg-background` (no header `z-40`). Indentação por `nivel` opcional.
- Linhas totalizadoras: `bg-primary/10 font-semibold`.
- Formatação:
  - Valores em BRL via `formatCurrency`, percentuais via `formatPercent` (2 casas) já existentes em `@/components/bi/utils/formatters`.
  - Negativos: `text-destructive` + envolto em parênteses (helpers `fmtSigned`/`fmtSignedPct` já no arquivo — manter e reutilizar).
- Loop: 13 grupos (12 meses + total) × 3 colunas = 39 + 1 coluna Máscara = 40 colunas. Render via array `const MESES = [{key:'jan', label:'Janeiro'}, …, {key:'total', label:'TOTAL'}]`.

### Remoções nesta página

- Bloco "Composição da DRE" (PieChart) e os 3 BarCharts de `series.*` — não atendidos pela nova RPC.
- `PageDataProvider` continua, mas `series` passa `{}` e `rows` continua com `linhas`.

## 3. Itens técnicos

- A RPC depende de `bi_vm_lanc_contabil`, `bi_vm_orc_dre`, `bi_dre_estrutura`, `bi_dre_mascara` (todas já existem, criadas na migração anterior).
- Enquanto as tabelas estiverem vazias, a RPC retorna apenas a estrutura com zeros — a tela funciona sem dados.
- Migração entra primeiro (aguarda aprovação), depois ajuste do `DrePage.tsx`.

## 4. Fora de escopo

- Popular `bi_dre_estrutura`/`bi_dre_mascara` (entrada manual ou ETL).
- Drill-down por mês/linha.
- Restaurar séries/gráficos com a nova fonte (pode vir em pedido futuro).

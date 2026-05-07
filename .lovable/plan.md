## Problema identificado

Na tela **Notas Fiscais de Recebimento → Drill-down Gerencial**, ao filtrar `Projeto Macro = GENIUS` e abrir Mês `2026-05 → Projeto`, o drill mostra apenas **R$ 33.061,00 / 4 NFs / 12 itens**.

O cabeçalho da tela mostra `250.403 registros · página 1/2505`, mas o drill recebe `dados` derivado de `dadosBrutos = data.dados` — que contém **apenas as 100 linhas da página atual** retornadas por `/api/notas-recebimento` (linha 208: `tamanho_pagina: 100`).

Ou seja: o "Valor Recebido" do drill não é o total real da base filtrada, é só a soma da página visível. Os mesmos 12 itens / 4 NFs comprovam isso (são exatamente os registros GENIUS dentro das 100 linhas atuais).

Mesma limitação afeta:
- KPIs (Qtd NFs, Total Recebido, Fornecedores, etc.)
- Gráficos (por mês, fornecedor, projeto, CC, etc.)
- Drill-down completo

## Solução proposta

Carregar **uma agregação completa** para alimentar KPIs/gráficos/drill, mantendo a paginação só para a "Lista Detalhada".

### Estratégia: fetch agregado em paralelo à listagem

Quando a busca é executada, disparar **dois requests** ao backend FastAPI:

1. **Listagem paginada** (já existe): `/api/notas-recebimento?...&pagina=N&tamanho_pagina=100` → continua alimentando a aba **Lista Detalhada** + paginação.
2. **Dataset gerencial** (novo): `/api/notas-recebimento?...&pagina=1&tamanho_pagina=50000` (ou parâmetro `agregado=true` se preferirmos endpoint dedicado) → alimenta **KPIs, gráficos e drill**.

Justificativa: a base tem 250k linhas no pior caso (sem filtros). Com filtros aplicados pelo usuário (Projeto Macro, Mês, etc.) o volume cai drasticamente. Limitar a 50k cobre praticamente todos os cenários filtrados sem travar o front. Quando o resultado bater no teto, exibimos um aviso claro de amostragem.

### Arquivos a alterar

**`src/pages/NotasRecebimentoPage.tsx`**
- Novo state `dadosAgregados` separado de `data` (paginado).
- `search()`: dispara o GET paginado (tamanho 100) **e** o GET agregado (tamanho 50000) em paralelo via `Promise.all`.
- `dadosBrutos` para a Lista Detalhada permanece `data.dados`.
- Criar `dadosBrutosAgregados = dadosAgregados?.dados ?? []` e usá-lo em:
  - `dadosEnriquecidos` / `dados` (filtros client-side de Projeto Macro, Tipo Despesa, Mês, Cond. Pagto)
  - `kpis`
  - `charts`
  - `<GenericDrillView dados={dados} ... />`
- A `<DataTable>` da aba "Lista Detalhada" continua usando o conjunto **paginado** (renomear para `dadosLista`) para não quebrar paginação.
- Aviso visual quando `dadosAgregados.total_registros > 50000`: chip "Amostra: 50.000 de N registros — refine os filtros para ver totais exatos".

**`src/pages/PainelComprasPage.tsx`** (mesmo problema)
- Aplicar idêntica separação: paginado para tabela + agregado para KPIs/gráficos/drill.

**`src/components/erp/GenericDrillView.tsx`** e **`src/components/compras/PainelDrillView.tsx`**
- Sem mudanças de lógica; apenas passarão a receber o dataset agregado.

### Backend (não bloqueante)

Idealmente o FastAPI exporia `/api/notas-recebimento/agregado?...` que retorna apenas as colunas necessárias para drill (sem paginar), reduzindo payload. Vou documentar a sugestão em `docs/backend-projeto-macro.md` (ou novo `docs/backend-agregacao.md`) — porém a correção do front **não depende** disso: usar `tamanho_pagina=50000` no endpoint atual já resolve.

### Validação manual após implementação

1. Filtrar Projeto Macro = GENIUS, sem mês → confirmar que Total Recebido bate com soma esperada.
2. Drill em Mês 2026-05 → Projeto: validar que os valores agora refletem o total da base, não só a página.
3. Lista Detalhada continua paginando 100 em 100.
4. Sem filtros (250k registros): aviso de amostragem aparece e drill mostra os 50k topo.

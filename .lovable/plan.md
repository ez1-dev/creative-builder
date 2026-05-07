## Objetivo

Estender o padrão "clicar no gráfico abre drill" para:
- **KPIs** da tela `Notas Fiscais de Recebimento` (clique abre drill no nível correspondente).
- **Gráficos do Painel de Compras** (Mês, Tipo de Despesa, Centro de Custo, Projeto, Fornecedor, Família, Origem) abrem o `PainelDrillView` já posicionado.

## Mudanças

### 1. `src/components/erp/KPICard.tsx`
- Adicionar prop opcional `onClick?: () => void`.
- Aplicar `cursor-pointer` quando `onClick` ou `details` presentes.
- Quando `onClick` existe (e não há `details`), o clique no Card dispara `onClick`. Quando há `details`, mantém o Popover atual (padrão atual).

### 2. `src/pages/NotasRecebimentoPage.tsx`
Tornar KPIs clicáveis usando o `openDrill` já existente:
| KPI | Ação |
|---|---|
| Qtd NFs / NFs | drill em nível "Nota Fiscal" — sem seed específico, apenas troca aba para drill no nível raiz (sem chave) |
| Itens Recebidos | troca aba para `drill` no nível raiz |
| Fornecedores / Maior Fornecedor | drill em `nome_fornecedor` (quando único) |
| Total Recebido / Valor Líquido / Valor Bruto / Ticket Médio | troca aba para `drill` |
| NFs com OC | aplica filtro client-side `apenas_com_oc` (chip) e abre drill no nível raiz |
| NFs sem OC | mesmo, mas `apenas_sem_oc` |

Como hoje não há filtro `apenas_com_oc` no estado de filtros, a abordagem mais simples e segura: KPIs de OC abrem o drill já posicionado em nível "Fornecedor" + scroll. Para "com/sem OC", adicionamos um `seed` virtual em nível novo `tem_oc` (Sim/Não). Para evitar criar nível novo, optamos por: clicar em "NFs com OC" / "NFs sem OC" simplesmente troca para a aba drill e dá scroll — sem seed (filtro visual fica para um próximo passo).

Decisão: **fazer apenas o que tem mapeamento direto e não-ambíguo**:
- "Maior Fornecedor": `openDrill('nome_fornecedor', kpis.maiorFornecedor.nome)`.
- Demais KPIs: clique troca para a aba `drill` (sem seed), via uma função `openDrillRoot()` que faz `setActiveTab('drill')` + `setDrillSeed(null)` + scroll.

### 3. `src/components/compras/PainelDrillView.tsx`
- Adicionar prop opcional `seed?: { nivel: Nivel; chave: string; label: string; nonce?: number }` com `useEffect` que substitui o stack quando `seed` muda (mesmo padrão usado no `GenericDrillView`).

### 4. `src/pages/PainelComprasPage.tsx`
- Estado novo: `drillSeed` + `drillRef`.
- Função `openDrill(nivel, chave, label)` que faz `setDrillSeed`, `setActiveTab('drill')` e scroll suave.
- Adicionar `cursor="pointer"` + `onClick` em cada `<Bar>` / `<Pie>`:
  - Top Fornecedores: `nivel='fantasia_fornecedor'`, `chave=d.fantasia_fornecedor`.
  - Entregas por Mês: `nivel='mes_competencia_calc'` (precisa derivar do `periodo_entrega` — usar `periodo_entrega` como chave, mas o nível drill é por `mes_competencia_calc`). Para simplicidade e consistência, manter chave igual ao texto `periodo_entrega`. Se não bater, o seed simplesmente não filtra (graceful).
  - Top Famílias: por enquanto não há nível "família" no `PainelDrillView` — pular.
  - Top Origens: idem — pular.
  - Compras por Mês (gerencial): `nivel='mes_competencia_calc'`, `chave=d.label`.
  - Compras por Tipo de Despesa: `nivel='tipo_despesa_calc'`, `chave=d.label`.
  - Top 10 Centros de Custo: `nivel='centro_custo'`, `chave=d.label`.
  - Top 10 Projetos: `nivel='numero_projeto'`, `chave=d.label`.
- O `<TabsContent value="drill">` envolve `<div ref={drillRef}>` e o `PainelDrillView` recebe `seed={drillSeed}`.

## Não escopo
- Não criar novos níveis no drill (ex: família, origem, OC sim/não) — exige decisões adicionais.
- Não mexer em outras telas (Faturamento Genius, Demonstrativo) neste passo — fica para um próximo, se solicitado, mantendo o padrão.

## Validação
- KPIs e gráficos clicáveis mostram `cursor-pointer` no hover.
- Clique troca aba para `drill` e posiciona no nível certo; "Limpar drill" zera o seed; voltar nível funciona; filtros globais continuam aplicados.
- Sem mocks; sem novos endpoints.

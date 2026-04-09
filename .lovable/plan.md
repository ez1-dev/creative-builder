

# Drill-down nos KPIs do Dashboard de Produção

## Abordagem

Os dados de `top_projetos_patio` já retornados pela API contêm breakdown por projeto com `kg_produzido`, `kg_expedido`, `kg_patio` e `kg_engenharia`. Vamos usar esses dados para popular a prop `details` dos KPICards relevantes, sem nenhuma chamada extra à API.

## Implementação

### Arquivo: `src/pages/producao/ProducaoDashboardPage.tsx`

1. Criar uma função helper `buildProjectDetails` que recebe `top_projetos_patio` e uma chave de peso (`kg_produzido` | `kg_expedido` | `kg_patio` | `kg_engenharia`), ordena por valor decrescente, e retorna um array de `{ label, value }` com os top 10 projetos no formato `"Proj 663 / Des 4200 Rev B" → "1.533 Kg"`.

2. Adicionar `details` e `tooltip` nos seguintes KPICards:
   - **Kg Previsto** → breakdown por `kg_engenharia`, tooltip "Peso previsto em engenharia"
   - **Kg Produzido** → breakdown por `kg_produzido`, tooltip "Total produzido (entrada estoque)"
   - **Kg Expedido** → breakdown por `kg_expedido`, tooltip "Total expedido (romaneio)"
   - **Kg Pátio** → breakdown por `kg_patio`, tooltip "Saldo em pátio (produzido − expedido)"

3. Filtrar itens com valor > 0 para não poluir o popover com linhas zeradas.

### Resultado esperado

Ao clicar em qualquer um dos 4 KPIs de peso, um popover aparece listando os top projetos que compõem aquele total, com projeto/desenho/revisão e o peso correspondente formatado.


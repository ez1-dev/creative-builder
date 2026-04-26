## Objetivo

Aplicar a aba/dashboard padrão **idêntico ao layout da referência (Power BI)** dentro de `/passagens-aereas`, para que o usuário tenha esse visual com 1 clique e os widgets fiquem visualmente fiéis ao print.

## O que muda

### 1. Novo botão "Aplicar layout Power BI" — `DashboardBuilder.tsx`

No modo edição, adicionar um botão que **substitui os widgets atuais** pelo conjunto da referência:

| Widget | Tipo | Posição (12 cols) | Config |
|---|---|---|---|
| TOTAL Mês | bar | x:0 y:0 w:6 h:5 | dimension=`data_registro` (granularity=month), metric=sum, field=valor |
| MOTIVO VIAGEM | pie | x:6 y:0 w:6 h:5 | dimension=`tipo_despesa`, metric=sum, field=valor |
| CENTRO DE CUSTO | table | x:0 y:5 w:5 h:5 | groupBy=`centro_custo` |
| Soma de TOTAL | kpi | x:5 y:5 w:3 h:5 | metric=sum, field=valor, format=currency |
| COLABORADOR | table | x:8 y:5 w:4 h:5 | groupBy=`colaborador` |

Implementação: função `applyPowerBILayout()` que (a) deleta widgets atuais do dashboard ativo, (b) faz `insert` dos 5 widgets acima em batch, (c) recarrega.

### 2. Barra de ações superior estilo Power BI — `DashboardBuilder.tsx`

Acima do grid, adicionar uma faixa fina (h-9, `bg-muted/40 border-b`) com ícones cinza-claro sem fundo (estilo Power BI):
- ↑ Sort asc · ↓ Sort desc · ⇅ Sort by · ⊞ Filter · ⛶ Focus mode · ⤢ Expand
- Ícones do `lucide-react`: `ArrowUp, ArrowDown, ArrowUpDown, Filter, Focus, Maximize2`
- Apenas decorativos por ora (mantém fidelidade visual; comportamento real é opcional)

### 3. Ajuste fino nos widgets — `WidgetRenderer.tsx`

- **KPI**: aumentar para `text-5xl md:text-6xl`, peso `font-semibold` (não bold), centro vertical absoluto — replicando o "R$520 Mil".
- **Pie**: limitar tamanho do label cortando nomes longos com `…` (>22 chars) para evitar quebra; usar `outerRadius="60%"` para dar espaço aos rótulos externos.
- **Bar**: rótulo `position="top"` em peso 600, formato `R$X Mil`.
- **Tabela com `groupBy`** (caso "CENTRO DE CUSTO" e "COLABORADOR"): renderizar versão **compacta** de 2 colunas (chave + total), ordenada desc, com linha **Total** no rodapé em destaque azul primário — exatamente como no print. Esse modo compacto entra quando o widget tem `groupBy` definido **e** nenhum groupBy retornaria sub-linhas relevantes (vamos simplificar: se `config.compact === true`, mostra só `chave | total`).
- Nos 5 widgets criados pelo "Aplicar layout Power BI", marcar `config.compact = true` nas duas tabelas.

### 4. Estilo visual do canvas

Já está com fundo claro neutro. Confirmar `containerPadding={[12,12]}` e `margin={[12,12]}` para corresponder ao espaçamento do Power BI (mais apertado que o atual 16).

## Arquivos afetados

- `src/components/dashboard-builder/DashboardBuilder.tsx`
  - Função `applyPowerBILayout()`
  - Botão "Aplicar layout Power BI" no modo edição (ao lado de Salvar/Cancelar)
  - Barra de ações superior decorativa
  - Ajuste de `margin` para `[12, 12]`
- `src/components/dashboard-builder/WidgetRenderer.tsx`
  - KPI maior (text-5xl/6xl)
  - Pie: truncar labels longos, outerRadius 60%
  - Tabela: modo compacto (2 colunas) quando `config.compact`
- `src/components/dashboard-builder/types.ts`
  - Adicionar campo opcional `compact?: boolean` em `WidgetConfig`

## Validação

Em `/passagens-aereas`:
1. Clicar **Personalizar** → **Aplicar layout Power BI** → **Salvar**.
2. Conferir que o resultado bate com a imagem: barras mensais à esquerda-topo, pizza à direita-topo, tabela CENTRO DE CUSTO à esquerda-baixo, KPI grande no meio-baixo, tabela COLABORADOR à direita-baixo.
3. Barra de ações cinza no topo do canvas.

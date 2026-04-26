# Plano: Tooltip enriquecida + Drill-down no gráfico Produtos x Serviços

## Diagnóstico

Hoje o gráfico **Produtos x Serviços** (Painel de Compras → aba Dashboard) usa:
- `dataKey="quantidade_itens"` apenas com `<Tooltip />` padrão e label numérico no Pie.
- Não exibe valor financeiro, percentual, nem permite drill-down.

A página já agrega os dados em memória (`tipoMap`) e já existe um filtro de tipo (`filters.tipo_item` Produto/Serviço/TODOS) usado pela tabela.

## O que será feito

### 1. Tooltip enriquecida ao passar o mouse
Reescrever a agregação para também somar **valor líquido** por tipo e calcular **percentual**. O tooltip customizado mostrará:
- Tipo (PRODUTO / SERVICO / Outros)
- Quantidade de itens (N e % do total)
- Valor líquido total (R$ formatado e % do total)

### 2. Drill-down ao clicar na fatia
Sim, é possível. Implementação: `onClick` na fatia do Pie aplica o filtro `tipo_item` correspondente e muda automaticamente para a aba **"Itens"** (tabela). Isso reaproveita o filtro server-side já existente — nenhum endpoint novo.

Comportamento:
- Clique em "PRODUTO" → seta `filters.tipo_item = 'PRODUTO'`, dispara `consultar()` e troca aba para Itens.
- Clique em "SERVICO" → idem com `'SERVICO'`.
- Clique em "Outros" → mantém `TODOS` (não há código ERP definido) e exibe toast informativo.
- Cursor `pointer` na fatia para indicar interatividade.
- Pequena dica de UI abaixo do título: *"Clique em uma fatia para ver os itens"*.

### 3. Mesma melhoria no gráfico "Situação das OCs" (bônus pequeno)
Como compartilha o mesmo padrão (Pie com Tooltip default), aplicar a mesma tooltip enriquecida (qtd + %) e drill-down clicando na fatia → filtra `situacao_oc` e vai para Itens. Útil para o usuário e custo marginal mínimo.

## Arquivos
- editar: `src/pages/PainelComprasPage.tsx`

## Validação
- Passar mouse sobre fatias mostra qtd, % e valor líquido formatado.
- Clicar em "PRODUTO" troca para aba Itens com tabela já filtrada apenas por produtos.
- Botão **Limpar** dos filtros volta `tipo_item` para `TODOS` (comportamento atual já existente).

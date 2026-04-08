

# Aperfeiçoamento do Módulo Produção

## Situacao Atual
As 7 páginas existem, com rotas, sidebar e permissoes configuradas. Porem todas estao em versao simplificada, faltando filtros, colunas, KPIs e graficos detalhados na especificacao.

## Gaps Identificados por Pagina

### 1. Dashboard Producao
- **KPIs**: Tem 5, faltam 8 (Qtd cargas, Itens nao carregados, Projetos aguardando/em producao/parcial/total expedidos, 3 lead times medios)
- **Graficos**: Nenhum implementado. Spec pede 4 (Produzido x Expedido por periodo, Saldo por projeto, Status projetos, Top projetos patio)
- **Grid**: Faltam colunas (Desenho, Revisao, Cliente, Data liberacao, Kg previsto, Itens nao carregados, Status geral)
- **ExportButton**: Nao existe nesta pagina

### 2. Produzido no Periodo
- **Filtros**: Tem 4, faltam 6 (Revisao, Produto, Cliente, Cidade, Origem, Familia)
- **Colunas**: Faltam Revisao, Produto, Qtd etiquetas, Cliente

### 3. Expedido para Obra
- **Filtros**: Tem 4, faltam 4 (Desenho, Revisao, Carga, Cliente, Cidade, Produto — reorganizar)
- **Colunas**: Faltam Revisao, Produto, Qtd cargas, Cliente

### 4. Saldo em Patio
- **Filtros**: Tem 2, faltam 4 (Revisao, Cliente, Faixa saldo, Somente saldo > 0)
- **Colunas**: Faltam Revisao, Kg previsto, % produzido/previsto, % expedido/previsto, % expedido/produzido, Status geral
- **Colunas a remover/ajustar**: dias_em_patio nao esta no spec

### 5. Itens Nao Carregados
- **Filtros**: Tem 2, faltam 3 (Revisao, Codigo barras, Cliente)
- **Colunas**: Faltam Revisao, Qtd codigos barras, Cliente, Status
- **Colunas a remover**: peso_kg, data_producao, motivo nao estao no spec

### 6. Lead Time Producao
- **Filtros**: Tem 3, faltam (Desenho, Revisao, Cliente, 3 pares de datas separados ao inves de 1)
- **Colunas**: Faltam Revisao, Status geral

### 7. Engenharia x Producao
- Ja e a mais completa. Faltam colunas: Kg refugo, Kg patio, Qtd prevista OP, Qtd utilizada OP

## Plano de Implementacao

### Etapa 1 — Dashboard com graficos e KPIs completos
**Arquivo**: `src/pages/producao/ProducaoDashboardPage.tsx`
- Adicionar ExportButton
- Expandir KPIs para 13 cards em grid responsivo (grid-cols-2 a grid-cols-6)
- Adicionar 4 graficos usando recharts (ja instalado): BarChart para Produzido x Expedido, BarChart horizontal para Top Patio, PieChart para Status, BarChart para Saldo por projeto
- Expandir grid com colunas completas da spec
- Usar calculo resiliente (useMemo) para KPIs e graficos quando API nao retornar dados pre-calculados

### Etapa 2 — Filtros e colunas das paginas de consulta
**Arquivos**: 5 paginas (Produzido, Expedido, Patio, NaoCarregados, LeadTime)
- Adicionar filtros faltantes com ComboboxFilter para campos como Origem, Familia, Cliente, Cidade
- Adicionar colunas conforme spec, com formatacao adequada (formatNumber, formatDate, formatPercent, Badge para Status)
- Adicionar checkbox "Somente saldo > 0" em SaldoPatioPage
- Separar 3 pares de datas no LeadTime

### Etapa 3 — Colunas extras em Engenharia x Producao
**Arquivo**: `src/pages/EngenhariaProducaoPage.tsx`
- Adicionar colunas: kg_refugo, kg_patio, qtd_prevista_op, qtd_utilizada_op

### Arquivos afetados
- `src/pages/producao/ProducaoDashboardPage.tsx` (reescrita significativa)
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/NaoCarregadosPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`
- `src/pages/EngenhariaProducaoPage.tsx`

Nenhuma migration SQL necessaria. Nenhuma alteracao de rotas ou sidebar.


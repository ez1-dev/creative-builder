

# Alinhar Frontend de Producao com a Query SQL Real

## Analise da Query Mestra

A query SQL retorna UMA linha por combinacao `(numero_projeto, numero_desenho, revisao)` com todos os campos de engenharia, producao, expedicao, patio, nao carregados e lead time consolidados. Os nomes dos campos JSON serao as versoes lowercase dos aliases SQL.

## Mapeamento SQL → JSON → Frontend Atual (Desalinhamentos)

### Campos que o frontend usa com nomes ERRADOS:

| Campo SQL | JSON esperado | Frontend usa atualmente |
|---|---|---|
| KG_PREVISTO_PROJETO | kg_previsto_projeto | kg_engenharia |
| KG_FABRICADO_CADASTRO | kg_fabricado_cadastro | kg_estrutura |
| NOME_CLIENTE | nome_cliente | cliente |
| PERC_PRODUZIDO_SOBRE_PREVISTO | perc_produzido_sobre_previsto | perc_atendimento_producao |
| PERC_EXPEDIDO_SOBRE_PREVISTO | perc_expedido_sobre_previsto | perc_expedido |
| PERC_EXPEDIDO_SOBRE_PRODUZIDO | perc_expedido_sobre_produzido | (nao usado) |
| DATA_PRIMEIRA_ENTRADA_ESTOQUE | data_primeira_entrada_estoque | primeira_producao |
| DATA_ULTIMA_ENTRADA_ESTOQUE | data_ultima_entrada_estoque | (nao usado) |
| DIAS_LIBERACAO_ATE_PRODUCAO | dias_liberacao_ate_producao | dias_engenharia_ate_producao |
| DIAS_TOTAL_LIBERACAO_ATE_EXPEDICAO | dias_total_liberacao_ate_expedicao | dias_total_ate_expedicao |
| STATUS_GERAL | status_geral | status_fluxo / status_patio |
| QTD_CODBAR_PRODUZIDOS | qtd_codbar_produzidos | (nao usado) |
| QTD_CODBAR_EXPEDIDOS | qtd_codbar_expedidos | (nao usado) |
| QTD_ITENS_NAO_CARREGADOS | qtd_itens_nao_carregados | (nao usado nas paginas certas) |

### Valores de STATUS_GERAL na query (vs frontend atual):
- `AGUARDANDO PRODUÇÃO` (frontend: ok)
- `EM PRODUÇÃO / SEM ENTRADA ESTOQUE` (frontend usa: `EM PRODUÇÃO`)
- `PRODUZIDO / EM PÁTIO` (frontend usa: `EM PÁTIO`)
- `EXPEDIÇÃO PARCIAL` (frontend usa: `PARCIALMENTE EXPEDIDO`)
- `TOTALMENTE EXPEDIDO` (frontend usa: `EXPEDIDO`)
- `SEM MOVIMENTO` (frontend nao trata)

### Campos novos disponiveis na query que o frontend nao exibe:
- `kg_recebido_cadastro`, `kg_refugo_cadastro`
- `qtd_prevista_op`, `qtd_utilizada_op`
- `qtd_embalada`, `qtd_etiquetas` (no CTE produzido)
- `qtd_codbar_produzidos`, `qtd_codbar_expedidos`
- `data_ultima_entrada_estoque`, `data_ultima_expedicao`
- `codigo_cliente`

## Correcoes por Pagina

### 1. Engenharia x Producao (`EngenhariaProducaoPage.tsx`)
- `kg_engenharia` → `kg_previsto_projeto`
- `kg_estrutura` → `kg_fabricado_cadastro` (renomear header para "Kg Fabricado")
- `cliente` → `nome_cliente`
- `perc_atendimento_producao` → `perc_produzido_sobre_previsto`
- `perc_expedido` → `perc_expedido_sobre_previsto`
- Remover coluna `familias` (nao existe na query)
- `status_fluxo` → `status_geral`
- Adicionar colunas uteis: `data_primeira_entrada_estoque`, `data_primeira_expedicao`, `qtd_cargas`
- Atualizar statusColor com os valores reais

### 2. Saldo em Patio (`SaldoPatioPage.tsx`)
- `kg_engenharia` → `kg_previsto_projeto` (header: "Kg Previsto")
- `perc_expedido` → `perc_expedido_sobre_previsto`
- `status_patio` → `status_geral`
- `cliente` → `nome_cliente`
- Adicionar `perc_produzido_sobre_previsto` e `perc_expedido_sobre_produzido`
- Atualizar statusColor com os valores reais
- KPIs client-side: ajustar para somar `kg_previsto_projeto` no lugar de `kg_engenharia`

### 3. Lead Time (`LeadTimeProducaoPage.tsx`)
- `primeira_producao` → `data_primeira_entrada_estoque`
- `primeira_expedicao` → `data_primeira_expedicao` (ok)
- `dias_engenharia_ate_producao` → `dias_liberacao_ate_producao`
- `dias_producao_ate_expedicao` → ok
- `dias_total_ate_expedicao` → `dias_total_liberacao_ate_expedicao`
- `status_fluxo` → `status_geral`
- `cliente` → `nome_cliente`
- Atualizar statusColor

### 4. Dashboard (`ProducaoDashboardPage.tsx`)
- O dashboard agrega os dados. Assumindo que o backend faz SUM/COUNT sobre esta query, os nomes no `resumo` podem estar corretos no backend. Mas se o backend simplesmente retorna os mesmos nomes da query:
  - `kg_engenharia` no resumo → deveria ser soma de `kg_previsto_projeto`
  - Verificar se o backend transforma os nomes ou nao
- Atualizar statusColor nos charts

### 5. Paginas de detalhe (Produzido, Expedido, Nao Carregados)
- Estas paginas usam endpoints de DETALHE que provavelmente tem queries separadas (item-level, nao agrupado por projeto/desenho). A query mestra uploaded nao cobre esses detalhes. Manter como estao ate confirmar.

## Arquivos Afetados
- `src/pages/EngenhariaProducaoPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`
- `src/pages/producao/ProducaoDashboardPage.tsx`


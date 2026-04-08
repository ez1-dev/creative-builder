

# Ajustar Frontend de Produção ao Backend Real

## Analise Comparativa Backend x Frontend

Analisei o codigo Python completo do backend e comparei com cada pagina do frontend. Encontrei varios desalinhamentos nos nomes dos campos retornados pela API vs os que o frontend espera.

## Desalinhamentos por Pagina

### 1. Dashboard (`ProducaoDashboardPage.tsx`)
**Problema critico**: O backend `/api/producao/dashboard` NAO retorna paginacao (`dados`, `total_paginas`, `total_registros`). Ele retorna `{ resumo: {...}, top_projetos_patio: [...], cargas_por_mes: [...] }`. O frontend trata como `PaginatedResponse` e tenta exibir uma grid com `data?.dados` que nao existe.

**Filtros**: Backend aceita `numero_projeto`, `numero_desenho`, `revisao`, `cliente`, `cidade`. Frontend envia `projeto` e `data_ini`/`data_fim` (que o backend NAO aceita).

**KPIs**: Os nomes no resumo do backend sao: `kg_engenharia`, `kg_produzido`, `kg_expedido`, `kg_patio`, `itens_nao_carregados`, `projetos_aguardando_producao`, `projetos_em_producao`, `projetos_parcialmente_expedidos`, `projetos_expedidos`, `leadtime_medio_engenharia_producao`, `leadtime_medio_producao_expedicao`, `leadtime_medio_total`, `quantidade_cargas`. O frontend usa nomes diferentes como `qtd_cargas`, `projetos_aguardando`, etc.

**Charts**: Backend retorna `top_projetos_patio` e `cargas_por_mes` no nivel raiz, NAO dentro de `graficos`. Frontend espera `data?.graficos?.produzido_expedido_periodo` etc.

**Acoes**: Remover interface PaginatedResponse, criar tipo correto. Usar `top_projetos_patio` do backend para charts. Alinhar nomes dos KPIs. Ajustar filtros para enviar `numero_projeto` em vez de `projeto`. Remover grid/paginacao que nao existe no backend.

### 2. Produzido (`ProduzidoPeriodoPage.tsx`)
**Colunas**: Frontend usa `produto`, `descricao`, `quantidade`, `peso_kg`, `qtd_etiquetas`, `data_primeira_entrada`, `data_ultima_entrada`. Backend retorna `codigo_produto`, `descricao_produto`, `quantidade_produzida`, `peso_real`, `quantidade_etiquetas`, `data_entrada_estoque` (campo unico, nao min/max).
**Filtros**: Frontend envia `projeto`, `desenho`, `produto`. Backend aceita `numero_projeto`, `numero_desenho`, `codigo_produto`.
**KPIs**: Backend NAO retorna `resumo` — retorna apenas a estrutura paginada padrao. Frontend espera `resumo.total_itens` etc.

### 3. Expedido (`ExpedidoObraPage.tsx`)
**Colunas**: Frontend usa `quantidade`, `peso_kg`, `qtd_cargas`, `data_primeira_expedicao`, `data_ultima_expedicao`. Backend retorna `quantidade_expedida`, `peso_real`, `data_carga` (unico), `motorista`, `placa`.
**Filtros**: Frontend envia `projeto`, `desenho`, `carga`, `produto`. Backend aceita `numero_projeto`, `numero_desenho`, `numero_carga`, `codigo_produto`.
**KPIs**: Backend NAO retorna `resumo`.

### 4. Saldo em Patio (`SaldoPatioPage.tsx`)
**Colunas**: Frontend usa `kg_previsto`, `perc_produzido_previsto`, `perc_expedido_previsto`, `perc_expedido_produzido`, `status`. Backend retorna `kg_engenharia` (nao `kg_previsto`), `perc_expedido`, `status_patio`, e NAO retorna `perc_produzido_previsto` nem `perc_expedido_previsto`.
**Filtros**: Frontend envia `projeto`, `desenho`. Backend aceita `numero_projeto`, `numero_desenho`. Frontend envia `faixa_saldo` e `somente_saldo_positivo` que o backend NAO aceita.
**KPIs**: Backend NAO retorna `resumo`.

### 5. Nao Carregados (`NaoCarregadosPage.tsx`)
**Colunas**: Frontend usa `qtd_itens_nao_carregados`, `qtd_codigos_barras`, `status`. Backend retorna `codigo_barras`, `codigo_peca`, `quantidade`, `sequencia` — e retornos sao por LINHA, nao agrupados por projeto/desenho.
**Filtros**: Frontend envia `projeto`, `desenho`, `revisao`. Backend aceita `numero_projeto`, `numero_desenho` (sem `revisao`!). Frontend envia `codigo_barras` e `cliente` que o backend aceita.
**KPIs**: Backend NAO retorna `resumo`.

### 6. Lead Time (`LeadTimeProducaoPage.tsx`)
**Colunas**: Frontend usa `data_engenharia`, `data_producao`, `data_expedicao`, `lead_eng_prod`, `lead_prod_exp`, `lead_total`, `status`. Backend retorna `data_liberacao_engenharia`, `primeira_producao`, `primeira_expedicao`, `dias_engenharia_ate_producao`, `dias_producao_ate_expedicao`, `dias_total_ate_expedicao`, `status_fluxo`.
**Filtros**: Frontend envia `projeto`, `desenho`. Backend aceita `numero_projeto`, `numero_desenho`. Frontend envia 6 filtros de data que o backend NAO aceita (apenas aceita os basicos).
**KPIs**: Backend NAO retorna `resumo`.

### 7. Engenharia x Producao (`EngenhariaProducaoPage.tsx`)
**Endpoint export**: Frontend usa `/api/export/engenharia-producao`, backend tem `/api/export/producao-engenharia-x-producao`.
**Colunas**: Frontend espera `descricao_desenho`, `data_entrega_engenharia`, `kg_entrada_estoque`, `status_producao`, `status_estoque`. Backend retorna `descricao_projeto`, `data_liberacao_engenharia`, NAO retorna `kg_entrada_estoque`/`status_producao`/`status_estoque` separados — retorna `status_fluxo`.
**Filtros**: Frontend envia `unidade_negocio`, `numero_op`, `status_atendimento`, `status_producao`, `status_estoque`, `data_entrega_ini/fim`. Backend aceita apenas `numero_projeto`, `numero_desenho`, `revisao`, `cliente`, `cidade`.
**Tipo**: Usa `EngenhariaResponse` com `resumo.total_paginas` aninhado, mas backend retorna paginacao padrao no nivel raiz.

## Plano de Implementacao

### Etapa 1 — Dashboard (reescrita)
- Criar tipo `DashboardData` sem paginacao: `{ resumo, top_projetos_patio, cargas_por_mes }`
- Alinhar filtros: `numero_projeto`, `numero_desenho`, `revisao`, `cliente`, `cidade`
- Mapear KPIs aos nomes reais do backend
- Usar `top_projetos_patio` diretamente para graficos de patio
- Usar `cargas_por_mes` para grafico de cargas por periodo
- Remover DataTable/PaginationControl (nao ha grid no backend)

### Etapa 2 — Produzido
- Mapear colunas: `codigo_produto`, `descricao_produto`, `quantidade_produzida`, `peso_real`, `quantidade_etiquetas`, `data_entrada_estoque`
- Alinhar filtros: `numero_projeto`, `numero_desenho`, `codigo_produto`
- Remover KPIs (backend nao retorna resumo)

### Etapa 3 — Expedido
- Mapear colunas: `quantidade_expedida`, `peso_real`, `numero_carga`, `data_carga`, `motorista`, `placa`
- Alinhar filtros: `numero_projeto`, `numero_desenho`, `numero_carga`, `codigo_produto`
- Remover KPIs

### Etapa 4 — Saldo em Patio
- Mapear: `kg_engenharia` (em vez de `kg_previsto`), `perc_expedido`, `status_patio`
- Alinhar filtros: `numero_projeto`, `numero_desenho`
- Remover `faixa_saldo` e `somente_saldo_positivo` (backend nao suporta; implementar filtragem client-side opcionalmente)
- Remover KPIs

### Etapa 5 — Nao Carregados
- Mapear colunas: `codigo_barras`, `codigo_peca`, `quantidade`, `sequencia`
- Remover `revisao` do filtro
- Alinhar nomes: `numero_projeto`, `numero_desenho`
- Remover KPIs

### Etapa 6 — Lead Time
- Mapear colunas: `data_liberacao_engenharia`, `primeira_producao`, `primeira_expedicao`, `dias_engenharia_ate_producao`, `dias_producao_ate_expedicao`, `dias_total_ate_expedicao`, `status_fluxo`
- Alinhar filtros: `numero_projeto`, `numero_desenho`
- Remover filtros de datas extras (backend nao aceita)
- Remover KPIs

### Etapa 7 — Engenharia x Producao
- Corrigir endpoint export para `/api/export/producao-engenharia-x-producao`
- Mapear colunas: `descricao_projeto`, `data_liberacao_engenharia`, `kg_estrutura`, `kg_patio`, `perc_atendimento_producao`, `perc_expedido`, `qtd_ops`, `ops`, `origens`, `familias`, `status_fluxo`
- Remover filtros nao suportados (`unidade_negocio`, `numero_op`, `status_*`, `data_entrega_*`)
- Adicionar filtros suportados: `cliente`, `cidade`
- Mudar tipo para `PaginatedResponse` padrao (sem resumo aninhado)

### Arquivos afetados
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/NaoCarregadosPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`
- `src/pages/EngenhariaProducaoPage.tsx`


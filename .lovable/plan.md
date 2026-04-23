

## Expandir `query_erp_data` para cobrir todo o ERP (incluindo Apontamento Genius)

### Problema
A tool `query_erp_data` hoje cobre apenas 7 módulos (estoque, painel-compras, compras-produto, contas-pagar, contas-receber, notas-recebimento, engenharia-producao). Quando o usuário pergunta:
- "tem ordem de produção acima de 8 horas?" → IA não encontra módulo `apontamento-genius` no mapa, cai em `engenharia-producao` e responde genérico.
- "saldo em pátio do projeto X?" → falta `producao-saldo-patio`.
- "auditoria tributária com divergência?" → falta `auditoria-tributaria`.

A IA não tem como filtrar/analisar campos como `horas_apontadas`, `tempo_total`, `kg_patio` em telas que existem mas não estão registradas.

### Causa raiz
O `MODULE_MAP` em `src/lib/aiQueryExecutor.ts` está incompleto e não reflete todas as rotas analíticas do app. Além disso, a IA não conhece **quais campos** cada módulo tem — então não sabe usar `order_by: 'horas_apontadas'` ou aplicar `filters: { horas_min: 8 }`.

### Solução

#### 1) Mapear TODOS os módulos analíticos no `aiQueryExecutor.ts`

Adicionar entradas para cobrir todo o ERP:

| Módulo | Endpoint | Ordenação padrão | Campos principais |
|---|---|---|---|
| `estoque` ✅ existe | `/api/estoque` | saldo | codpro, despro, saldo, coddep |
| `painel-compras` ✅ | `/api/painel-compras` | valor_liquido_total | numero_oc, fornecedor, valor_liquido_total |
| `compras-produto` ✅ | `/api/compras-produto` | quantidade | codpro, despro, fornecedor, quantidade |
| `contas-pagar` ✅ | `/api/contas-pagar` | valor_aberto | numero_titulo, fornecedor, valor_aberto |
| `contas-receber` ✅ | `/api/contas-receber` | valor_aberto | numero_titulo, cliente, valor_aberto |
| `notas-recebimento` ✅ | `/api/notas-recebimento` | valor_liquido_total | numero_nf, fornecedor, valor_liquido_total |
| `engenharia-producao` ✅ | `/api/producao/engenharia-x-producao` | data_liberacao_engenharia | numero_projeto, kg_patio, status_geral |
| **`apontamento-genius`** 🆕 | `/api/auditoria-apontamento-genius` | tempo_total_horas | numero_op, operador, tempo_total_horas, descricao_op |
| **`producao-saldo-patio`** 🆕 | `/api/producao/saldo-patio` | kg_patio | numero_projeto, descricao, kg_patio, dias_em_patio |
| **`producao-expedido-obra`** 🆕 | `/api/producao/expedido-obra` | kg_expedido | numero_projeto, cliente, kg_expedido, data_expedicao |
| **`producao-nao-carregados`** 🆕 | `/api/producao/nao-carregados` | dias_aguardando | numero_op, projeto, dias_aguardando |
| **`producao-lead-time`** 🆕 | `/api/producao/lead-time` | lead_time_dias | numero_op, lead_time_dias, status |
| **`producao-produzido-periodo`** 🆕 | `/api/producao/produzido-periodo` | kg_produzido | data, kg_produzido, qtd_ops |
| **`auditoria-tributaria`** 🆕 | `/api/auditoria-tributaria` | divergencia_valor | numero_nf, fornecedor, divergencia_valor |
| **`conciliacao-edocs`** 🆕 | `/api/notas-edocs-conciliacao` | divergencias | chave_nfe, situacao, divergencias |
| **`numero-serie`** 🆕 | `/api/numero-serie` | numero_serie | numero_serie, numero_op, status |
| **`bom`** 🆕 | `/api/bom` | nivel | codigo_modelo, codigo_componente, quantidade, nivel |
| **`onde-usa`** 🆕 | `/api/onde-usa` | quantidade_usada | codigo_componente, codigo_pai, quantidade_usada |
| **`estoque-min-max`** 🆕 | `/api/estoque-min-max` | saldo_atual | codpro, saldo_atual, estoque_minimo, estoque_maximo |
| **`sugestao-min-max`** 🆕 | `/api/sugestao-min-max` | sugestao_compra | codpro, sugestao_compra, prioridade |

Cada módulo recebe:
- `endpoint`: rota real do FastAPI (verificada no código de cada page).
- `defaultOrderBy`: campo numérico/data mais relevante para ranking.
- `defaultFields`: 5–7 campos principais (reduz tokens).
- `permissionPath`: rota usada em `useUserPermissions.canViewPath()`.
- `baseParams` (opcional): ex. `{ somente_com_estoque: true }`.

#### 2) Enriquecer descrição da tool com **dicionário de campos**

Hoje a IA chuta `order_by`. Vamos passar no `system prompt` (ou na própria descrição da tool) um **resumo de cada módulo + campos disponíveis**:

```
MÓDULOS ERP DISPONÍVEIS (use em query_erp_data.module):
- apontamento-genius: ordens de produção da unidade GENIUS com tempo apontado
  campos: numero_op, operador, descricao_op, tempo_total_horas, data_apontamento, status
  filtros: numero_op, operador, data_inicio, data_fim, horas_min, horas_max
  exemplo: "OPs com mais de 8 horas" → filters:{horas_min:8}, order_by:'tempo_total_horas'
- producao-saldo-patio: peças produzidas aguardando expedição
  campos: numero_projeto, descricao, kg_patio, dias_em_patio, cliente
  ...
```

Esse bloco é construído dinamicamente a partir do `MODULE_MAP` (cada entrada ganha `description` + `availableFilters` + `examplePrompt`) e injetado no `systemPrompt` na edge function.

#### 3) Suporte a filtros derivados no cliente

Para perguntas tipo "OPs acima de 8 horas" quando o backend não tem o filtro `horas_min`, o cliente aplica **filtro pós-busca** antes do ranking:

```ts
// aiQueryExecutor.ts - novo bloco
if (args.client_filters) {
  records = records.filter(r => {
    for (const [field, cond] of Object.entries(args.client_filters)) {
      if (cond.gte != null && !(r[field] >= cond.gte)) return false;
      if (cond.lte != null && !(r[field] <= cond.lte)) return false;
      if (cond.eq != null && r[field] !== cond.eq) return false;
    }
    return true;
  });
}
```

Tool ganha parâmetro opcional `client_filters: { campo: { gte?, lte?, eq? } }`.

#### 4) Validação de permissão por módulo
Já existe (`canViewPath`). Atualizar `permissionPath` de cada novo módulo para bater com o registrado em `profile_screens` (ex.: `/auditoria-apontamento-genius`, `/saldo-patio`, etc.).

#### 5) Tratamento de paginação grande
Alguns módulos (BOM, onde-usa) podem ter milhares de linhas. Limitar `tamanho_pagina: 200` segue valendo, mas a tool documenta na descrição: *"Sempre inclua filtros restritivos para módulos amplos (BOM, onde-usa, conciliacao-edocs)."*

### Arquivos alterados

- `src/lib/aiQueryExecutor.ts`
  - Expandir `MODULE_MAP` com os 13 novos módulos.
  - Adicionar `description`, `availableFilters`, `examples` em cada entrada.
  - Suportar `client_filters` (gte/lte/eq) aplicados antes do ranking.
  - Exportar helper `buildModulesCatalog()` que serializa o mapa para o prompt.

- `supabase/functions/ai-assistant/index.ts`
  - Atualizar parameter `module` da tool `query_erp_data`: enum com todos os módulos novos.
  - Adicionar parameter `client_filters` (object).
  - Injetar **catálogo de módulos** no system prompt (gerado via `buildModulesCatalog`).
  - Reforçar instrução: "Antes de chamar `apply_erp_filters` para perguntas analíticas, sempre tente `query_erp_data` para responder com dados reais."

- `src/components/erp/AiAssistantChat.tsx`
  - Passar `client_filters` adiante para `executeQueryErpData`.

### Casos de teste

1. `/auditoria-apontamento-genius` → "tem OP acima de 8 horas?" → IA chama `query_erp_data` `{module:'apontamento-genius', client_filters:{tempo_total_horas:{gte:8}}, order_by:'tempo_total_horas', top_n:10}` → tabela com OPs.
2. Qualquer rota → "saldo em pátio acima de 30 dias" → `module:'producao-saldo-patio', client_filters:{dias_em_patio:{gte:30}}`.
3. "qual NF tem maior divergência tributária?" → `module:'auditoria-tributaria', order_by:'divergencia_valor'`.
4. "produtos abaixo do mínimo no estoque" → `module:'estoque-min-max', client_filters:{saldo_atual:{lte:0}}` cruzando com `estoque_minimo`.
5. Sem permissão para `/numero-serie` → IA recebe erro e responde "sem acesso".

### Fora de escopo
- Cross-módulo agregado (ex.: "compare horas Genius vs kg expedido") — exige tool sequencial; futuro.
- Edição/escrita via IA.
- Geração de gráficos.

### Resultado
Pergunta **"tem ordem de produção acima de 8 horas?"** passa a responder:
> Encontrei 12 ordens de produção com mais de 8 horas apontadas:
> | OP | Operador | Descrição | Horas |
> |---|---|---|---|
> | 45821 | José Silva | Solda Estrutura A | 12,5 |
> | ... |
> Quer abrir a tela com esses filtros aplicados?

Funciona em **todas as 20 telas analíticas do ERP**, respeitando permissões e sem expor dados de outros usuários.


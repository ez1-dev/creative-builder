
## Novo módulo: Sugestão Min/Max (baseada em movimentação histórica)

Tela analítica complementar a `Estoque Min/Max`. Calcula consumo médio, lead time e sugere política a partir de E210MVP/E210DLS, permitindo gravar em `USU_EST_POLITICA`.

### Frontend (este repo)

**1. Nova página `src/pages/SugestaoMinMaxPage.tsx`**
Padrão visual idêntico aos demais módulos analíticos (PageHeader + FilterPanel + KPICards + DataTable + PaginationControl).

- **Filtros**: Código, Descrição, Família (Combobox), Origem (Combobox), Derivação, Depósito, Período inicial, Período final (defaults: hoje−180d → hoje).
- **6 KPICards**: Saldo Atual (soma), Consumo 90d, Consumo 180d, Lead Time Médio (dias), Mínimo Sugerido (soma), Máximo Sugerido (soma). Lidos de `data.resumo` com fallback agregando `data.dados` (padrão `tech/calculo-kpi-resiliente`).
- **Colunas da tabela**: Data Movimento, Tipo Movimento, Transação, Depósito, Quantidade (right), Documento, Fornecedor/Origem, Saldo Atual (right), Consumo Médio (right), Mínimo Sugerido (right), Máximo Sugerido (right), Status (badge).
- **Ações no header**:
  - `Consultar movimentação` → `GET /api/estoque/movimentacao` (lista linhas analíticas).
  - `Gerar sugestão` → `GET /api/estoque/sugestao-politica` (recalcula KPIs e colunas sugeridas).
  - `Salvar política` → `POST /api/estoque/politica/salvar` (persiste em USU_EST_POLITICA usando o ERP user do token atual). Exibe toast com sucesso/erro.
- Status do produto colorido com mesmo mapeamento já usado em `Estoque Min/Max` (verde/âmbar/vermelho/azul/cinza).
- Erros de API resilientes (padrão `gestao-erros-conexao-erp`); exportação opcional via `ExportButton` se backend publicar `/api/export/estoque/sugestao-politica`.

**2. `src/lib/api.ts`**
Adicionar interfaces:
- `EstoqueMovimentacaoResponse extends PaginatedResponse<any>` com `resumo?` (saldo_atual_total, consumo_90d, consumo_180d, lead_time_medio_dias, minimo_sugerido_total, maximo_sugerido_total).
- `SugestaoPoliticaResponse` (mesma forma da movimentação, com campos sugeridos por linha agregada produto/derivação/depósito).
- Body do `salvar` reutiliza o mesmo shape de `R999_POLITICA_MINMAX` já documentado.

**3. `src/App.tsx`**
Registrar rota protegida `/sugestao-min-max` apontando para `SugestaoMinMaxPage`.

**4. `src/components/AppSidebar.tsx`**
Inserir item `{ title: 'Sugestão Min/Max', url: '/sugestao-min-max', icon: Sparkles }` logo abaixo de `Estoque Min/Max` (mesmo grupo "Módulos").

**5. `src/pages/ConfiguracoesPage.tsx`**
Adicionar `{ path: '/sugestao-min-max', name: 'Sugestão Min/Max' }` à matriz de telas conhecidas.

**6. Permissões (Supabase migration)**
`INSERT ... SELECT id FROM access_profiles ... ON CONFLICT (profile_id, screen_path) DO UPDATE SET can_view = true` para `/sugestao-min-max`, garantindo a aba visível em todos os perfis existentes.

### Backend (FORA deste repo — apenas documentar)

Criar **`docs/backend-sugestao-minmax.md`** com:

**Tabela** `USU_EST_POLITICA` — PK `(CODEMP, CODPRO, CODDER, CODDEP)`. Colunas:
`ESTOQUE_MINIMO, ESTOQUE_MAXIMO, PONTO_PEDIDO, LOTE_COMPRA, CONSUMO_MEDIO_MENSAL, LEAD_TIME_DIAS, OBS, USUARIO, DATA_ALT`.

**Endpoints** (autenticação via Bearer já existente — sem token global; `USUARIO` extraído do JWT):

- `GET /api/estoque/movimentacao` — params: `codpro, despro, codfam, codori, codder, coddep, data_ini, data_fim, pagina, tamanho_pagina`. Lê E210MVP (movimentação principal) com `LEFT JOIN E210PRO` para descrição/família/origem; complementa com E210DLS quando o tipo de movimento não estiver gravado em E210MVP (UNION ALL com flag `origem_dado`). Saldo atual via E210EST agregado.
- `GET /api/estoque/sugestao-politica` — agrupa por `(codemp, codpro, codder, coddep)`. Calcula:
  - `consumo_diario_medio = SUM(saidas_180d) / 180`
  - `consumo_mensal = consumo_diario_medio * 30`
  - `lead_time_dias` = média de `(data_entrada_nf − data_pedido)` em E210MVP/E440NFC para o produto/fornecedor habitual; default 15 dias se sem histórico
  - `estoque_seguranca = consumo_diario_medio * 0.5 * lead_time_dias`
  - `minimo = consumo_diario_medio * lead_time_dias + estoque_seguranca`
  - `lote_compra` ← USU_EST_POLITICA atual ou `consumo_mensal`
  - `maximo = minimo + lote_compra`
  - `ponto_pedido = minimo`
  - Retorna lista + `resumo` agregado para os KPIs.
- `POST /api/estoque/politica/salvar` — body com array `politicas[]` (mesmas chaves acima) ou objeto único; faz `MERGE` em `USU_EST_POLITICA`, gravando `USUARIO` do token e `DATA_ALT = GETDATE()`.
- Pseudo-SQL completo para cada endpoint, incluindo o `UNION ALL` E210MVP+E210DLS.

### Memória
Salvar `mem://features/sugestao-minmax` (resumindo fórmulas, endpoints e fluxo Consultar→Gerar→Salvar) e atualizar `mem://index.md` na seção Memórias.

### Sem alterações em
Autenticação, `useUserPermissions`, `EstoqueMinMaxPage`, layout global, módulos de Compras/Produção/Financeiro/Tributário, sidebar de Produção.

### Observação
Enquanto os 3 endpoints novos não estiverem publicados, a tela carrega com mensagem de API indisponível (padrão de resiliência já existente). Os botões `Consultar / Gerar / Salvar` exibem toast de erro sem quebrar a navegação.

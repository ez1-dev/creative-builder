
## Nova página: Estoque Min/Max

Criar tela de análise de política de reposição seguindo o padrão visual já consolidado (PageHeader + FilterPanel + KPICards + DataTable + PaginationControl + ExportButton).

### Frontend (este repo)

**1. `src/pages/EstoqueMinMaxPage.tsx`** (novo)
- Estrutura idêntica a `EstoquePage.tsx` (mesmos componentes, mesmo layout).
- **Filtros**: Código, Descrição, Família (Combobox), Origem (Combobox), Derivação, Depósito, Situação (Ativo/Inativo/Todos), checkboxes "Somente abaixo do mínimo", "Somente sem política", "Somente com saldo".
- **6 KPICards** no topo: Abaixo do Mínimo, Acima do Máximo, Sem Política, OK, Sugestão p/ Mínimo (soma), Sugestão p/ Máximo (soma). Lidos de `data.resumo` quando presente; fallback agregando `data.dados` (padrão `tech/calculo-kpi-resiliente`).
- **Colunas**: Código (sticky), Descrição (sticky), Família (sticky), Origem, Derivação, Depósito, Saldo Atual, Estoque Mín, Estoque Máx, Ponto Pedido, Sugestão Mín, Sugestão Máx, Status (badge colorido).
- **Status (cor)**: `SEM_POLITICA` cinza, `ABAIXO_MINIMO` vermelho, `NO_MINIMO` âmbar, `ACIMA_MAXIMO` azul, `ENTRE_MIN_E_MAX` verde. Calculado client-side se o backend não enviar, usando as regras descritas.
- Endpoint consumido: `GET /api/estoque-min-max` (paginado). Exportação: `GET /api/export/estoque-min-max` via `ExportButton`.

**2. `src/lib/api.ts`**
- Adicionar interface `EstoqueMinMaxResponse extends PaginatedResponse<any>` com `resumo` opcional (abaixo_minimo, acima_maximo, sem_politica, ok, sugestao_minimo_total, sugestao_maximo_total).

**3. `src/App.tsx`**
- Importar `EstoqueMinMaxPage` e registrar rota protegida `/estoque-min-max`.

**4. `src/components/AppSidebar.tsx`**
- Inserir item `{ title: 'Estoque Min/Max', url: '/estoque-min-max', icon: Gauge }` logo abaixo de "Consulta de Estoques".

**5. Permissões (Supabase — migration)**
- Inserir `screen_path = '/estoque-min-max'` em `profile_screens` para todos os perfis existentes com `can_view = true`, para que a aba apareça imediatamente sem reconfigurar perfis.

### Backend (FORA deste repo — apenas documentar)

Como o FastAPI não está neste repositório, criar **`docs/backend-estoque-min-max.md`** com o contrato completo para o time backend implementar:

- **Tabela nova** `R999_POLITICA_MINMAX` (ou nome equivalente no schema livre): `CODEMP, CODPRO, CODDER, CODDEP, ESTOQUE_MINIMO, ESTOQUE_MAXIMO, PONTO_PEDIDO, LOTE_COMPRA, OBS, USUARIO, DATA_ALT` — PK composta `(CODEMP, CODPRO, CODDER, CODDEP)`.
- **`GET /api/estoque-min-max`**: query params (`codpro, despro, codfam, codori, codder, coddep, situacao_cadastro, somente_abaixo_minimo, somente_sem_politica, somente_com_saldo, pagina, tamanho_pagina`); JOIN `E210PRO` (cadastro) + saldo de `E300EST` agregado + LEFT JOIN política. Resposta: `dados[]` com campos das colunas + bloco `resumo`.
- **`POST /api/estoque-min-max/politica`**: upsert de uma linha de política (chave composta acima) preenchendo `USUARIO` e `DATA_ALT = GETDATE()`.
- **`GET /api/export/estoque-min-max`**: mesma query, retorna XLSX (mesmo padrão dos outros exports).
- Pseudo-SQL e mapeamento de status incluídos no doc.

### Memória
Salvar `mem://features/modulo-estoque-min-max` resumindo a tela e seus 5 status, e atualizar `mem://index.md`.

### Sem alterações em
Autenticação, outras páginas, layout, KPI/Filter/Table genéricos, módulos existentes, sidebar de Produção.

### Observação
Enquanto o backend não publicar `/api/estoque-min-max`, a tela carrega normalmente e mostra mensagem de erro amigável da API (padrão `gestao-erros-conexao-erp`). A coluna Status e as Sugestões já vêm calculadas no frontend caso o backend devolva apenas os campos crus (`saldo, estoque_minimo, estoque_maximo`).

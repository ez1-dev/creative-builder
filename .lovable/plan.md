## Apontar Assistente IA ao endpoint novo de Apontamento Genius

### Diagnóstico (verificado agora no código)

**Já está correto na página `AuditoriaApontamentoGeniusPage.tsx`:**
- Listagem chama `GET /api/apontamentos-producao` (linha 599).
- Exportação chama `GET /api/export/apontamentos-producao` (linha 1158).
- Normalizador `normalizeRowApont` (linhas 58–143) já produz os campos novos exigidos: `status_movimento`, `horas_realizadas` (em minutos), `data_movimento`, `data_inicio`/`hora_inicio`, `data_final`/`hora_final`, `nome_operador`, `numcad`.
- As menções a `status_apontamento` / `horas_apontadas` / `data_apontamento` no arquivo são **apenas fallbacks de leitura** dentro do próprio normalizador — comportamento desejado para tolerar payloads antigos sem quebrar.

**Único ponto realmente desatualizado:** `src/lib/aiQueryExecutor.ts` (linhas 127–134) registra a rota lógica `apontamento-genius` do Assistente IA apontando para o endpoint **antigo** `/api/auditoria-apontamento-genius` e com campos antigos no `defaultFields` (`tempo_total_horas`, `descricao_op`, `data_apontamento`). Isso faz com que perguntas em linguagem natural ao Assistente IA sobre apontamento Genius caiam no endpoint inexistente.

### Correção

**Arquivo:** `src/lib/aiQueryExecutor.ts` (somente o bloco `apontamento-genius`)

- `endpoint`: `/api/auditoria-apontamento-genius` → `/api/apontamentos-producao`
- `defaultOrderBy`: `tempo_total_horas` → `data_movimento`
- `defaultFields`: `['numero_op', 'operador', 'descricao_op', 'tempo_total_horas', 'data_apontamento']` → `['numero_op', 'nome_operador', 'numcad', 'descricao_produto', 'horas_realizadas', 'data_movimento', 'status_movimento']`
- `availableFilters`: `['numero_op', 'operador', 'data_inicio', 'data_fim']` → `['numop', 'operador', 'codpro', 'codori', 'status_op', 'data_ini', 'data_fim', 'somente_discrepancia', 'somente_acima_8h']` (alinhado ao contrato do endpoint novo).
- `permissionPath` e `description`: mantém.

### O que NÃO mexer (intencionalmente)
- **Rotas de UI** `'/auditoria-apontamento-genius'` em `App.tsx`, `AppSidebar.tsx`, `ConfiguracoesPage.tsx`, `userUsageMetrics.ts`: são **URLs da SPA**, não endpoints da API. Mudar a URL da página quebraria permissões cadastradas no banco (`profile_screens`) e bookmarks dos usuários.
- **Fallbacks de leitura** dentro de `normalizeRowApont` (`r.status ?? r.status_apontamento`, `r.horas_apontadas`, `r.data_apontamento`): mantidos por robustez — só são usados se o campo novo vier ausente.
- Documentação `docs/backend-auditoria-apontamento-genius.md`: descreve o contrato; sem alteração nesta tarefa (o título do doc é histórico).

### Validação após a aplicação
1. Recarregar `/auditoria-apontamento-genius` → grid carrega normalmente (já estava OK).
2. No Assistente IA, perguntar algo como “mostra os apontamentos Genius com mais de 8h dos últimos 30 dias” → a chamada deve sair para `/api/apontamentos-producao` (verificável pela aba Network), não mais 404 em `/api/auditoria-apontamento-genius`.

### Resultado
Toda a integração de Apontamento Genius (tela + Assistente IA) passa a usar exclusivamente o endpoint novo `/api/apontamentos-producao` e o contrato de campos novos. Sem fallback dizendo que o backend não existe, sem renomear rotas de UI.

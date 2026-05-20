## Visão geral

Novo módulo **Desenvolvimento de Relatórios**: cadastro/edição/preview/publicação de relatórios SQL para qualquer módulo do ERP. Metadados (relatório, parâmetros, colunas, layout, execuções) ficam no Lovable Cloud com RLS restrita a admins. Execução de SQL contra o ERP é delegada ao backend FastAPI via 2 endpoints novos (`/preview` e `/{id}/executar`); o frontend nunca acessa o ERP direto.

3 rotas / 3 itens de menu:

- `/relatorios/desenvolvimento` — ReportBuilderPage (lista + editor)
- `/relatorios/publicados` — Relatórios Publicados (executor para usuários)
- `/relatorios/execucoes` — Histórico de Execuções

## Backend (Lovable Cloud)

Tabelas em `public.*` com RLS exigindo `has_role(auth.uid(),'admin')` para mutações; leitura de publicados liberada a autenticados.

```text
relatorios
  id uuid pk, codigo text unique, nome text, descricao text,
  modulo text, categoria text, fonte_dados text,
  sql_query text, status text check in ('rascunho','publicado','inativo') default 'rascunho',
  permite_excel bool, permite_pdf bool, permite_csv bool,
  created_by uuid, created_at, updated_at

relatorio_parametros
  id uuid pk, relatorio_id uuid fk cascade,
  nome text, label text, tipo text, obrigatorio bool,
  valor_padrao text, ordem int, sql_lista text

relatorio_colunas
  id uuid pk, relatorio_id uuid fk cascade,
  campo text, titulo text, visivel bool, ordem int,
  tipo text, formato text, alinhamento text,
  totalizar bool, agrupar bool

relatorio_layout
  relatorio_id uuid pk fk cascade,
  tipo text check in ('tabela_simples','tabela_agrupada','cards','grafico','tabela_grafico'),
  titulo text, subtitulo text,
  mostrar_filtros bool, mostrar_totais bool,
  mostrar_data_hora bool, mostrar_usuario bool,
  agrupar_por text, config jsonb

relatorio_execucoes
  id uuid pk, relatorio_id uuid fk, executado_por uuid,
  executado_em timestamptz default now(),
  parametros jsonb, qtd_linhas int, tempo_ms int,
  status text, erro text, formato text
```

Trigger `update_updated_at` em `relatorios`. RLS:
- `relatorios SELECT`: autenticado vê `publicado`; admin vê tudo.
- `relatorios INSERT/UPDATE/DELETE`: admin.
- Tabelas filhas: idem (via has_role).
- `relatorio_execucoes`: usuário vê próprias execuções; admin vê todas; INSERT autenticado quando o relatório é visível para ele.

## Backend FastAPI (especificação — não vou implementar, vou documentar)

Documento em `docs/backend-relatorios.md` cobrindo:

- `POST /api/relatorios/validar-sql` → `{ valido, erro, parametros: ['cod_emp', ...], colunas: [{nome,tipo}] }`. Roda EXPLAIN parametrizado; bloqueia comandos != SELECT (regex + parser).
- `POST /api/relatorios/preview` `{ sql, parametros }` → executa LIMIT 100, retorna `{ colunas, linhas, tempo_ms }`. Bloqueia DML/DDL.
- `POST /api/relatorios/{id}/executar` `{ parametros }` → busca SQL do Cloud (service role), executa no ERP, grava execução no Cloud, retorna resultado.
- `POST /api/relatorios/{id}/exportar/{formato}` → mesma execução + stream Excel/CSV/PDF.

CRUD (`GET/POST/PUT /api/relatorios`) **não** vai pro FastAPI — fica direto no Cloud via `supabase` client. Removo esses do escopo do FastAPI para não duplicar fonte de verdade.

## Frontend

### Estrutura

```text
src/pages/relatorios/
  DesenvolvimentoRelatoriosPage.tsx   (ReportBuilderPage)
  RelatoriosPublicadosPage.tsx
  HistoricoExecucoesPage.tsx
src/components/relatorios/
  ReportList.tsx
  ReportEditor.tsx
  tabs/
    DadosGeraisTab.tsx
    SqlTab.tsx           (usa SqlEditor)
    ParametrosTab.tsx    (ParametersEditor)
    ColunasTab.tsx       (ColumnsEditor)
    LayoutTab.tsx        (LayoutEditor)
    PreviewTab.tsx       (ReportPreview)
  SqlEditor.tsx          (Monaco, lazy-loaded)
  ReportExecutionHistory.tsx
  ReportRunner.tsx       (executor com formulário de parâmetros, usado em /publicados)
src/lib/relatorios/
  api.ts                 (CRUD Cloud + chamadas FastAPI preview/executar/exportar)
  parseSqlParams.ts      (regex /:([a-z_][a-z0-9_]*)/g)
  types.ts
  schemas.ts             (zod para forms)
```

### Telas

**ReportBuilderPage** (`/relatorios/desenvolvimento`): split layout — `ReportList` à esquerda (tabela com filtros por módulo/categoria/status; colunas: Código, Nome, Módulo, Categoria, Fonte, Status badge, Atualizado em, Ações), `ReportEditor` à direita ao selecionar um item (ou em modal full-screen se preferir). Botão "Novo relatório" abre editor vazio.

**ReportEditor**: 6 abas shadcn `Tabs`. Estado controlado por um único hook `useReportEditor(id)` (rascunho local + dirty flag). Salvar exige SQL válida (flag setada pela aba SQL ou no submit chama `validar-sql`).

- **Dados Gerais**: form zod (nome 1-120, descricao 0-1000, modulo enum dinâmico, categoria, fonte_dados, status, 3 toggles export). Código gerado automaticamente (slug do nome + sufixo numérico).
- **SQL**: `SqlEditor` Monaco (lazy `React.lazy` + Suspense, `@monaco-editor/react`, modo `sql`). Botões `Validar SQL`, `Detectar parâmetros` (chama parseSqlParams local + cria/atualiza linhas em parâmetros), `Pré-visualizar` (muda para aba Preview e executa).
- **Parâmetros**: tabela editável com colunas Nome, Label, Tipo (texto/número/data/lista), Obrigatório, Valor padrão, Ordem, SQL Lista (textarea quando tipo=lista). Linhas vêm de "Detectar parâmetros" mas editáveis manualmente; ordenação drag-and-drop simples por setas ↑↓.
- **Colunas**: aparece após primeira preview. Tabela editável: Campo (readonly), Título, Visível, Ordem, Tipo, Formato (date/number/currency), Alinhamento (esq/centro/dir), Totalizar, Agrupar. Estado persistido com o relatório.
- **Layout**: radio cards com 5 opções (Tabela simples, Tabela agrupada, Cards gerenciais, Gráfico, Tabela + gráfico). Campos: Título, Subtítulo, toggles (Mostrar filtros, totais, data/hora, usuário), Agrupar por (select com colunas detectadas).
- **Pré-visualização**: form de parâmetros (gerado da aba Parâmetros) → botão Executar Preview → grid (componente `DataTable` simples do projeto) com colunas formatadas, footer mostrando "X linhas • Y ms", banner de erro vermelho se SQL falhar, botões Exportar Excel/CSV/PDF (chamam FastAPI mas só habilitados se status=publicado).

**RelatoriosPublicadosPage** (`/relatorios/publicados`): lista só status=publicado, ao clicar abre `ReportRunner` (formulário de parâmetros + executar + grid + exportar).

**HistoricoExecucoesPage** (`/relatorios/execucoes`): tabela de `relatorio_execucoes` com filtros (relatório, usuário, data, status). Admin vê todas; usuário comum vê próprias.

### Menu lateral

Adicionar grupo collapsible **Relatórios** em `AppSidebar.tsx` (padrão do grupo Produção/Regras Senior), com 3 sub-itens. Ícone `FileBarChart2`. Visibilidade gated por admin (`has_role`) via `useUserPermissions` — se usuário não tem `/relatorios/desenvolvimento`, esconder esse item mas mostrar `/publicados` e `/execucoes`.

### Rotas em `App.tsx`

3 rotas novas dentro de `AppLayout`, envolvidas em `ProtectedRoute` com o path correspondente.

### Detalhes técnicos

- **Monaco**: `bun add @monaco-editor/react monaco-editor`. Carregado com `React.lazy` apenas na aba SQL para não pesar o bundle.
- **parseSqlParams**: regex `/(?<!:):([a-z_][a-z0-9_]*)/gi` retornando set único, preservando ordem de aparição.
- **Bloqueio de DML no frontend**: heurística regex `/^\s*(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/im` antes de enviar. Backend FastAPI tem validação autoritativa.
- **Validação zod** em todos os forms (nome, sql, parâmetros) conforme padrão do projeto.
- **Sem cores hardcoded**: usar tokens `bg-card`, `text-muted-foreground`, `badge` variants já definidos.
- **i18n**: textos em pt-BR como o resto do app.

## Fora de escopo

- Implementação dos endpoints FastAPI (só especificação em `docs/backend-relatorios.md`).
- Permissões granulares por relatório/usuário (fica para v2; v1 usa apenas admin × autenticado).
- Versionamento histórico do SQL (mudanças sobrescrevem; `relatorio_execucoes` registra o que rodou).
- Editor visual de gráficos avançado (layout Gráfico usa preset simples baseado nas colunas; expansão fica para v2).
- Agendamento de relatórios.

## Ordem de entrega

1. Migração Cloud (4 tabelas + RLS + trigger).
2. `src/lib/relatorios/` (types, schemas, api, parseSqlParams).
3. `ReportList` + `DesenvolvimentoRelatoriosPage`.
4. `ReportEditor` com as 6 abas (instalar Monaco junto da aba SQL).
5. `RelatoriosPublicadosPage` + `ReportRunner`.
6. `HistoricoExecucoesPage`.
7. Sidebar + rotas + `docs/backend-relatorios.md`.

## Objetivo

Evoluir o módulo **Desenvolvimento de Relatórios** (já existente em `src/pages/relatorios/DesenvolvimentoRelatoriosPage.tsx` + `src/components/relatorios/*`) para se tornar o **construtor central de relatórios** do sistema, com motor de impressão reutilizável (`RelatorioPrintEngine`), templates, versionamento e publicação por módulo. A Impressão de Ordem de Produção continua funcionando como hoje e, ao final, é migrada para usar o novo motor.

Frente: edição, preview e impressão. Backend FastAPI: validação SQL, execução e exportação. Lovable Cloud: metadados (relatórios, versões, parâmetros, colunas, layouts, permissões, execuções).

## Entrega em 4 ondas

### Onda 1 — Base do módulo (estende o que já existe)

Hoje já temos: `ReportList`, `ReportEditor`, `SqlTab`, `DadosGeraisTab`, `ParametersEditor`, `ColumnsEditor`, `LayoutEditor`, `ReportPreview`, `ReportExecutionHistory`, tabelas `relatorios / relatorio_parametros / relatorio_colunas / relatorio_layout / relatorio_execucoes`. A Onda 1 só completa lacunas:

- **Central de Relatórios** com filtros (módulo, categoria, status, publicado, tipo) e busca por nome/código — hoje a lista é simples.
- **Ações de linha** já parcialmente prontas: adicionar "Duplicar", "Testar SQL", "Histórico" e "Excluir" no `ReportList`.
- **DadosGeraisTab**: adicionar `categoria`, `icone`, `permite_impressao` (já tem módulo, status, tipo_fonte, permite_excel/pdf/csv).
- **SqlTab**: já tem validação SELECT/WITH e bloqueio DML; adicionar botão "Formatar SQL" (sql-formatter) e "Salvar versão".
- **ParametersEditor**: tipos extras `periodo`, `lista_sql`, `multi`, `empresa`, `filial`, `produto`, `cliente`, `fornecedor`, `op` (hoje só texto/numero/data/lista/booleano).
- **Preview**: já existe; padronizar exibição de tempo e erros do backend.

### Onda 2 — Layout, publicação, versões

- **ColumnsEditor**: completar com `visivel_excel`, `visivel_pdf`, `permite_ordenar`, `permite_filtrar`, formatos `quantidade/minutos/horas/status`, regras condicionais (badge/cor por condição).
- **LayoutEditor**: tipos `mestre_detalhe`, `dashboard`, `relatorio_operacional` (hoje tem tabela_simples/agrupada/cards/grafico/tabela_grafico); congelar colunas, paginação, ordenação padrão, destaques condicionais.
- **Publicação**: aba dedicada com menu de destino, permissões por perfil (`access_profiles` / `profile_screens`), versão publicada, data, publicado por.
- **Versões**: nova tabela `relatorio_versoes` (snapshot de sql/config/layout/css/parametros/colunas). Tela de histórico com comparar, restaurar, publicar versão antiga, duplicar.

### Onda 3 — Impressão avançada (núcleo da migração da OP)

Cria a base reutilizável de impressão, hoje espalhada em `OpPrintSheet`, `OpPrintBatch`, `op-print.css`.

- **Aba Layout de Impressão** no editor:
  - papel, orientação, margens (mm), fonte, tamanho, cabeçalho, rodapé, quebras, repetir cabeçalho, evitar página em branco final.
  - configurações específicas por template (ex.: OP: margem desenho 8mm, frame 194x281mm, 1 desenho por página, quebrar por operação, limite componentes inline = 7).
- **Aba Templates** com seleção/criação de template e preview ao vivo.
- **RelatorioPrintEngine** (`src/components/relatorios/print/`):
  - `RelatorioPrintEngine.tsx` — orquestra páginas A4, aplica `@page` margins via CSS vars, garante `page-break-before` entre blocos e nunca `page-break-after` no último.
  - `ReportPrintPage`, `ReportHeader`, `ReportFooter`, `ReportTable` (thead repetido), `ReportGroup`, `ReportDrawingPage` (object-fit contain, centralizado, sem corte), `ReportBarcode`, `ReportPageBreak`.
  - Templates iniciais: `tabela_padrao`, `relatorio_gerencial`, `relatorio_operacional`, `ordem_producao_genius`.
- **Migração da OP**: `OpPrintBatch`/`OpPrintSheet` passam a montar suas seções como children do `RelatorioPrintEngine` no template `ordem_producao_genius`. `op-print.css` é absorvido por CSS do engine + overrides do template. Comportamento atual preservado (margem 7mm `@page` + 8mm padding, componentes em página própria quando > 7, etc.).
- **Exportação PDF/Excel** chama os endpoints do FastAPI já especificados em `docs/backend-relatorios.md`.

### Onda 4 — Inteligência (Lovable AI)

Usa o gateway já disponível (`google/gemini-2.5-flash` para geral, `gpt-5.4` para SQL complexa):

- Gerar SQL a partir de descrição.
- Sugerir colunas/filtros a partir do retorno.
- Detectar erros e propor correção.
- Sugerir índices/otimizações.
- Gerar documentação automática do relatório.

## Mudanças técnicas

### Lovable Cloud (migrações)

Novas tabelas (RLS = admin gerencia, autenticado lê quando relatório publicado):

- `relatorio_versoes` (id, relatorio_id, versao, sql_base, config_json, layout_json, parametros_json, colunas_json, css_print, status, criado_por, criado_em, observacao).
- `relatorio_publicacoes` (id, relatorio_id, versao_id, modulo, menu_path, publicado_por, publicado_em, ativo).
- `relatorio_permissoes` (id, relatorio_id, profile_id, can_view, can_export, can_print).
- `relatorio_templates_impressao` (id, codigo, nome, tipo, config_json, css, html_tsx_key).

Ajustes em tabelas existentes:

- `relatorios`: adicionar `categoria`, `icone`, `permite_impressao`, `versao_atual`, `template_impressao_id`.
- `relatorio_parametros`: ampliar enum `tipo` (DB usa text, só atualizar zod).
- `relatorio_colunas`: adicionar `visivel_excel`, `visivel_pdf`, `permite_ordenar`, `permite_filtrar`, `regra_condicional_json`.
- `relatorio_layout`: adicionar `congelar_colunas`, `paginacao`, `por_pagina`, `ordenacao_padrao`, `destaques_json`.

### Backend FastAPI

Já documentado em `docs/backend-relatorios.md`. Aditivos:

- `POST /api/relatorios/{id}/versoes` e `POST /api/relatorios/{id}/versoes/{vid}/restaurar|publicar` (alternativa: tudo no Cloud).
- Header `ngrok-skip-browser-warning: true` mantido.

### Frontend — estrutura final

```text
src/pages/relatorios/
  DesenvolvimentoRelatoriosPage.tsx   (lista + editor lado a lado, hoje)
  RelatorioPreviewPage.tsx            (novo, preview fullscreen)
  HistoricoExecucoesPage.tsx          (já existe)
  RelatoriosPublicadosPage.tsx        (já existe)

src/components/relatorios/
  ReportList.tsx, ReportEditor.tsx            (existem; ampliar)
  ReportPreview.tsx, ReportExecutionHistory   (existem)
  SqlEditor.tsx                                (existe)
  ParametersEditor.tsx, ColumnsEditor.tsx,
  LayoutEditor.tsx                             (existem; ampliar)
  PrintLayoutEditor.tsx                        (novo — onda 3)
  TemplatesEditor.tsx                          (novo — onda 3)
  PublishTab.tsx, VersionsTab.tsx              (novos — onda 2)
  tabs/                                        (já existe; novas tabs)
  print/
    RelatorioPrintEngine.tsx
    ReportPrintPage.tsx
    ReportHeader.tsx, ReportFooter.tsx
    ReportTable.tsx, ReportGroup.tsx
    ReportDrawingPage.tsx, ReportBarcode.tsx
    ReportPageBreak.tsx
    templates/
      tabelaPadrao.ts
      relatorioGerencial.ts
      relatorioOperacional.ts
      ordemProducaoGenius.tsx   (envolve a lógica atual de OpPrintSheet)
    engine.css
```

### Princípios

- Tokens semânticos do design system; nada de cores hardcoded.
- Nenhum SQL executado no front. Validação heurística no front (`checkSqlSafe`), validação autoritativa no FastAPI.
- OP continua funcionando durante toda a onda 3 — só é migrada no fim, atrás de um flag (`feature_op_use_print_engine`).
- Cada onda é entregável de forma independente.

## Fora de escopo desta proposta

- Não mexer em `src/integrations/supabase/{client,types}.ts` nem `.env`.
- Não mudar comportamento atual das OPs antes da migração final controlada por flag.
- Não implementar editor visual drag-drop de impressão (templates são código + config JSON).
- Não implementar exportação no Cloud (fica no FastAPI conforme `docs/backend-relatorios.md`).

## Confirmação antes de codar

1. Começar pela **Onda 1** (filtros, ações, parâmetros ampliados, formatar SQL) e seguir em sequência?
2. Versionamento — guardar snapshot completo (sql + parâmetros + colunas + layout) por versão, OK?
3. Migração da OP — manter `OpPrintBatch` legado funcionando atrás de feature flag e só remover quando o template `ordem_producao_genius` estiver 100% equivalente, confirma?

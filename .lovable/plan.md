# Contabilidade ETL no mesmo padrão do Comercial

Hoje a tela `BI > Contabilidade` (`AtuContabilidadePanel`) usa endpoints próprios (`/api/bi/contabilidade/status|sync|log`) e ações hard-coded no frontend. A tela genérica `EtlTarefaDetalhePage` (rota `/etl/tarefas/:nome`) já implementa todo o fluxo desejado (executar tarefa/ação, ver log, editar SQL versionado em `etl_acoes.sql_template`, testar SQL, ativar/inativar) consumindo `etl_tarefas` / `etl_acoes` do Cloud + endpoints genéricos `/api/etl/...` do FastAPI. O plano é fazer Contabilidade cair nesse mesmo trilho.

## 1. Migration — cadastrar tarefa e ações no Cloud

Nova migration. Não há `comando_sql`/`coluna_periodo` em `etl_acoes` — vamos:
- adicionar coluna `coluna_periodo text` (nullable) em `public.etl_acoes`;
- adicionar coluna `tentativas smallint NOT NULL DEFAULT 1` (campo da tela);
- inserir 1 tarefa + 4 ações.

```sql
ALTER TABLE public.etl_acoes
  ADD COLUMN IF NOT EXISTS coluna_periodo text,
  ADD COLUMN IF NOT EXISTS tentativas smallint NOT NULL DEFAULT 1;

INSERT INTO public.etl_tarefas (grupo, nome_tarefa, descricao, ativa, ordem)
VALUES ('CONTABILIDADE', 'ATU_CONTABILIDADE', 'Atualização BI Contabilidade', true, 20)
ON CONFLICT (nome_tarefa) DO NOTHING;

WITH t AS (SELECT id FROM public.etl_tarefas WHERE nome_tarefa='ATU_CONTABILIDADE')
INSERT INTO public.etl_acoes
  (tarefa_id, ordem, id_acao, nome_acao, tipo_execucao, tipo_comando,
   tabela_destino, coluna_periodo, estrategia_carga, caso_erro, tentativas)
VALUES
  ((SELECT id FROM t), 1,  'VM_ORC_DRE',                'Orçamento DRE',
     'API','SQL', 'bi_vm_orc_dre',                'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 2,  'VM_LANC_CONTABIL',          'Lançamentos contábeis',
     'API','SQL', 'bi_vm_lanc_contabil',          'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 3,  'ETL_V_BALANCO_PATRIMONIAL', 'Balanço patrimonial',
     'API','SQL', 'bi_etl_v_balanco_patrimonial', 'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 99, 'ATU_CONTABILIDADE',         'Finalização contabilidade',
     'API','FUNCAO', NULL, NULL, 'REPLACE_PERIODO','CONTINUAR',1)
ON CONFLICT DO NOTHING;
```

SQL real de cada ação fica vazio inicialmente — admin cola/edita pelo modal de SQL (já existente) e versiona via `etl_acao_sql_versoes` (trigger atual).

## 2. Frontend — usar a tela genérica

Substituir o painel customizado por navegação para `/etl/tarefas/ATU_CONTABILIDADE`.

- **`src/pages/EtlAdminPage.tsx`** — remover bloco `<AtuContabilidadePanel />` (e import).
- **`src/components/AppSidebar.tsx`** — em `biSubItems`, trocar/adicionar:  
  `{ title: 'Contabilidade — Atualização', url: '/etl/tarefas/ATU_CONTABILIDADE', icon: Database }` (logo abaixo de "Contabilidade — DRE").
- **`src/lib/screenCatalog.ts`** + **`src/pages/ConfiguracoesPage.tsx`** — registrar `/etl/tarefas/ATU_CONTABILIDADE` (código `CONT_ATU`, nome "Contabilidade — Atualização").
- Não mexer em `EtlTarefaDetalhePage` — ela já cobre as 9 colunas pedidas (ORDEM, AÇÕES, NOME, DEPENDÊNCIA, CASO ERRO, TENT., SITUAÇÃO, INÍCIO, FIM), o botão **Executar tarefa** (= `Executar ATU_CONTABILIDADE`), e por linha Executar / Ver log / Editar SQL / Testar SQL / Inativar.
- Tela DRE (`src/pages/bi/contabilidade/DrePage.tsx`) **continua** consumindo `GET /api/bi/contabilidade/dre` — sem alteração.

## 3. Arquivos a remover

- `src/components/etl/contabilidade/AtuContabilidadePanel.tsx`
- `src/components/etl/contabilidade/ContabilidadeLogDialog.tsx`
- `src/components/etl/contabilidade/ContabilidadeViewerDialog.tsx`
- `src/components/etl/contabilidade/statusUi.ts`
- `src/lib/bi/contabilidadeApi.ts` (helper antigo `/api/bi/contabilidade/{status,sync,log}` — não é mais usado; a função `getContabilidadeData` também sai porque não há mais consumidor).

## 4. Contrato FastAPI (doc only — `docs/backend-etl-contabilidade.md`)

Reaproveita endpoints genéricos já documentados em `docs/backend-etl-central.md`. Só publicar a seção específica:

```
GET   /api/etl/tarefas/ATU_CONTABILIDADE/acoes
GET   /api/etl/acoes/{acao_ref}/comando-sql          -> { comando_sql, versao, atualizado_em }
PATCH /api/etl/acoes/{acao_ref}/comando-sql          -> aceita: comando_sql, tabela_destino,
                                                       coluna_periodo, ordem, ativa, caso_erro, tentativas
POST  /api/etl/acoes/{acao_ref}/testar-sql           -> { parametros, sql_template?, limite? }
POST  /api/etl/tarefas/ATU_CONTABILIDADE/executar    -> { anomes_ini, anomes_fim, acionado_por }
GET   /api/bi/contabilidade/dre                      (já existe — lê bi_vm_orc_dre, bi_vm_lanc_contabil,
                                                       bi_dre_estrutura, bi_dre_mascara)
```

Comportamento esperado do executor (já implementado para ATU_COMERCIAL):
1. Substitui `$[ANOMES_INI]` / `$[ANOMES_FIM]` no `comando_sql`.
2. Roda no ERP Senior via `etl_conexoes`.
3. `DELETE FROM <tabela_destino> WHERE <coluna_periodo> BETWEEN :ini AND :fim`.
4. `INSERT` em lote no Cloud (service role).
5. Grava `etl_execucoes`, `etl_acao_execucoes`, `etl_logs` (qtd_linhas, erro, início/fim).

## Não muda

- DRE consome `GET /api/bi/contabilidade/dre` (já é o caso).
- Tabelas `bi_*` (já existem) e fluxo de versionamento de SQL (`etl_acao_sql_versoes` + trigger `etl_acoes_versionar_sql`).
- Página `/contabilidade/balanco`.

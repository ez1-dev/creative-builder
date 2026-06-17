
## Objetivo
Criar o módulo **Configuração da DRE Gerencial** em `/bi/contabilidade/dre/configuracao`, com 4 abas, fluxo rascunho → simulação → publicação, e auditoria. Todas as gravações de configuração ficam no Lovable Cloud; consultas ao ERP (plano de contas) e simulação contínuam via FastAPI.

## Escopo
- Frontend: nova página, navegação, hooks, libs e tipos.
- Backend Cloud: tabelas novas para versionamento (rascunho/publicado) + auditoria.
- Backend FastAPI: 2 endpoints novos (plano de contas + simulação). Documentar em `docs/` para o time de backend implementar.

## Estrutura técnica

### 1) Tabelas no Lovable Cloud (migração)
- `bi_dre_modelos` — versionamento do modelo (`id`, `nome`, `status: rascunho|publicado|arquivado`, `versao`, `publicado_em`, `publicado_por`, `descricao`).
- `bi_dre_estrutura_v2` — substitui/estende `bi_dre_estrutura` por linha:
  `modelo_id`, `ordem`, `codigo_linha` (UNIQUE no modelo), `descricao`, `nivel`, `linha_pai_codigo`, `tipo_linha (TITULO|ANALITICA|AGRUPADORA|TOTAL|CALCULO)`, `formula`, `ativo`, e flags: `flag_soma`, `flag_inverte_sinal`, `flag_exibe_dre`, `flag_permite_drill`, `flag_negrito`, `flag_totalizadora`.
- `bi_dre_linha_regra` — `modelo_id`, `codigo_linha`, `tipo_regra (CONTA_CONTABIL|MASCARA_CONTA|CENTRO_CUSTOS|CENTRO_CUSTOS_3|ORIGEM|TRANSACAO|HISTORICO|COMBINACAO|EXCECAO_LANCAMENTO)`, `operador (=|LIKE|IN|<>)`, `valor`, `cd_empresa`, `cd_filial`, `cd_conta_contabil`, `cd_mascara`, `cd_centro_custos`, `cd_centro_custos_3`, `cd_origem_lcto`, `cd_tns`, `ds_historico`, `sinal smallint`, `prioridade int`, `ativo`.
- `bi_dre_auditoria` — `entidade`, `entidade_id`, `acao (CRIAR|EDITAR|INATIVAR|DUPLICAR|PUBLICAR|REORDENAR|VINCULAR)`, `payload_antes jsonb`, `payload_depois jsonb`, `usuario_id`, `created_at`.
- RLS: leitura `authenticated`; escrita restrita por `is_admin(auth.uid())` OR `can_edit('/bi/contabilidade/dre/configuracao')`. GRANTs para `authenticated` e `service_role`.
- A migração mantém `bi_dre_estrutura` antiga como compatibilidade (usada em outras telas) — não removida nesta entrega.

### 2) Endpoints FastAPI (novos — documentar em `docs/`)
- `GET /api/erp/plano-contas` — params: `busca`, `pagina`, `tamanho`. Retorna `cd_conta`, `cd_reduzido`, `mascara`, `ds_conta`, `analitica`, `nivel`. Para a aba "Contas do ERP".
- `POST /api/bi/contabilidade/dre/simular` — body: `{ modelo_id, ano, mes_ini, mes_fim, unidade }`. Aplica regras do **rascunho** sem afetar o publicado. Retorna por linha: `codigo_linha`, `realizado`, `orcado`, `diferenca`, `pct`, `qtd_lancamentos`. Reaproveita drill existente `GET /api/bi/contabilidade/dre-drill` passando `modelo_id` opcional (default = publicado).
- `POST /api/bi/contabilidade/dre/publicar` — promove rascunho → publicado (versão N+1) e dispara `NOTIFY pgrst, 'reload schema'`. Idempotente.

### 3) Frontend

Arquivos novos:
- `src/pages/bi/contabilidade/DreConfiguracaoPage.tsx` — shell com `DashboardTabs` (4 abas).
- `src/components/bi/contabilidade/configuracao/`
  - `EstruturaTreeTab.tsx` — TreeView com drag-drop de ordem, modal Add/Edit linha (codigo_linha técnico obrigatório, validação de unicidade), botões Duplicar/Inativar.
  - `RegrasLinhaTab.tsx` — drawer/painel lateral; tabela `DataTableBI` das regras da linha selecionada; CRUD por regra; combos para tipo_regra/operador.
  - `ContasErpTab.tsx` — busca paginada do plano de contas, multi-seleção, botão "Vincular à linha selecionada" (cria N registros `bi_dre_linha_regra`).
  - `SimulacaoTab.tsx` — filtros (período, modelo=rascunho, unidade), tabela com KPIs por linha, drill reaproveita `DreDrillDrawer` existente, botão **Publicar modelo** (habilita só depois da simulação rodar nesta sessão).
- `src/lib/bi/dreConfigApi.ts` — funções: `listModelos`, `getModeloAtivo`, `criarRascunho`, `listLinhas`, `upsertLinha`, `reordenarLinhas`, `duplicarLinha`, `listRegras(codigoLinha)`, `upsertRegra`, `deleteRegra`, `vincularContasComoRegras(linhaCodigo, contas[], tipo)`, `buscarPlanoContas(query)`, `simular(payload)`, `publicarModelo(modeloId)`, `listAuditoria(entidade,id)`.
- `src/hooks/useDreConfig.ts` — estado do modelo rascunho corrente + cache de linhas/regras.
- `src/lib/bi/dreConfigTypes.ts` — enums e DTOs.

Atualizações:
- `src/components/AppSidebar.tsx`: adicionar item "Config. DRE Gerencial" → `/bi/contabilidade/dre/configuracao` no grupo BI.
- `src/App.tsx`: rota nova protegida.
- `src/lib/screenCatalog.ts`: registrar tela para permissões.

### 4) Regras invariantes (obrigatórias)
- `codigo_linha` técnico em TODA chamada (criação, vinculação, simulação, drill). Nunca enviar `descricao`/label.
- Validar no submit: `codigo_linha` obrigatório, sem espaços, UPPER_SNAKE; falha → toast com motivo.
- Toda mutação cria registro em `bi_dre_auditoria` (usuário, antes/depois).
- "Publicar modelo" só fica habilitado se houver simulação bem-sucedida na sessão atual; após publicar, modelo vira `publicado`, novo rascunho clonado.
- Logs `console.log('[DRE CONFIG] ...')` antes de cada chamada para diagnóstico.

## Fora de escopo
- Migrar telas existentes de DRE (matriz, exceções, aprovações, sincronização) para o novo modelo versionado — entrega futura.
- Edição visual de fórmulas (parser); manter `formula` como texto livre por enquanto.
- Internacionalização / temas.

## Validação
- Criar rascunho, adicionar linha `RECEITA_BRUTA` (ANALITICA), vincular máscara `3.1.%` → simular ano corrente → publicar → matriz `/bi/contabilidade/dre` reflete o novo modelo.
- Tentar salvar linha com `descricao` como código → bloqueado por validação.
- Auditoria mostra entradas CRIAR/VINCULAR/PUBLICAR.

## Pendências para o usuário confirmar antes de implementar
1. Confirmar que o backend FastAPI vai expor `plano-contas`, `simular` e `publicar`, ou se devo deixar mocks no front até estarem prontos.
2. Confirmar se posso criar as novas tabelas no Cloud sem migrar a `bi_dre_estrutura` atual (compatibilidade lado-a-lado).

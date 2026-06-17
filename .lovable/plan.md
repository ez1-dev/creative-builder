## Classificação assistida no drill da DRE

Adicionar fluxo de classificação manual de lançamentos diretamente do drill de `LANCAMENTO`, com escopos progressivos (lançamento → documento → combinação → regra definitiva), simulação de impacto e fila de aprovação para regras definitivas.

### 1. Lovable Cloud (migração)

Nova tabela `bi_dre_classificacoes` (substitui/complementa `bi_dre_excecoes` para os novos escopos — `bi_dre_excecoes` continua existindo para compatibilidade):

Campos de domínio:
- `escopo` enum (`LANCAMENTO`, `DOCUMENTO`, `COMBINACAO`, `REGRA_DEFINITIVA`)
- `status` enum (`ATIVO`, `PENDENTE_APROVACAO`, `APROVADO`, `REJEITADO`, `INATIVO`)
- Chaves do lançamento original: `nr_lancamento`, `nr_lote`, `nr_documento`, `cd_mascara`, `cd_conta_contabil`, `cd_centro_custos`, `cd_centro_custos_3`, `cd_origem_lcto`, `cd_tns`, `ds_historico`, `anomes_referente`, `vl_realizado`
- Classificação: `codigo_linha_origem`, `codigo_linha_destino`, `motivo`
- Auditoria: `criado_por`, `aprovado_por`, `aprovado_em`

Índices por `(escopo, status)`, `nr_lancamento`, `nr_documento`, e combinação `(cd_tns, cd_conta_contabil, cd_centro_custos, cd_origem_lcto)`.

RLS: `authenticated` lê/insere; aprovação/rejeição restrita a perfil admin (via `has_role`); `service_role` total.

### 2. Backend (somente especificação em `docs/`)

Atualizar `docs/backend-bi-contabilidade-dre-drill.md` e criar `docs/backend-bi-contabilidade-dre-classificar.md` com:

- `POST /api/bi/contabilidade/dre-classificar-lancamento` — body com todos os campos do lançamento + `codigo_linha_destino` + `escopo` + `motivo`. Para `REGRA_DEFINITIVA`, grava com `status='PENDENTE_APROVACAO'`; demais escopos gravam `status='ATIVO'`. Decimal→float, `traceback.print_exc()`, `HTTPException(502)`.
- `POST /api/bi/contabilidade/dre-classificar-simular` — recebe mesmos campos, retorna impacto previsto: `{ linha_origem: { antes, depois }, linha_destino: { antes, depois }, qtd_lancamentos_afetados }`. Para escopos amplos (`DOCUMENTO`, `COMBINACAO`, `REGRA_DEFINITIVA`) mostra quantos lançamentos adicionais serão movidos.
- RPC `public.bi_dre_drill_realizado` passa a aplicar também `bi_dre_classificacoes` ativas com `COALESCE` por ordem de prioridade: LANCAMENTO > DOCUMENTO > COMBINACAO > REGRA_DEFINITIVA (somente APROVADO) > exceção legada > regra padrão.
- Nada de geração automática de regra ampla sem registro explícito do usuário.

### 3. Frontend

**`DreClassificarModal.tsx`** (novo) — usado dentro do `DreDrillDrawer`:
- Cabeçalho mostra todos os campos read-only do lançamento.
- Select de **Linha destino** com as 13 opções listadas (constante `DRE_LINHAS_DESTINO`).
- Radio group de **Escopo** com tooltip explicativo de cada nível.
- Textarea de **Motivo** (obrigatório).
- Botão **Simular impacto** chama endpoint de simulação e mostra card com antes/depois e quantidade afetada.
- Botão **Salvar** habilitado só após preencher destino + motivo; em `REGRA_DEFINITIVA` muda o label para "Enviar para aprovação".
- Após sucesso: fecha modal, dispara invalidate da query `dre-matriz` e do drill atual.

**`DreDrillDrawer.tsx`** — quando `tipo_drill === 'LANCAMENTO'`, adicionar botão **"Classificar lançamento"** ao lado de "Marcar exceção" em cada linha, abrindo o novo modal pré-preenchido.

**`src/lib/bi/dreClassificarApi.ts`** (novo) — funções `classificarLancamento` e `simularClassificacao` chamando FastAPI com token + `ngrok-skip-browser-warning`.

**`src/pages/bi/contabilidade/DreAprovacoesPage.tsx`** (novo, rota `/bi/contabilidade/dre/aprovacoes`) — lista classificações com `status='PENDENTE_APROVACAO'`, permite aprovar/rejeitar (update direto na tabela via Cloud).

**Sidebar / App.tsx** — adicionar entrada "Aprovações DRE" na seção Contabilidade.

### 4. Não fazer

- Não alterar `bi_dre_mascara`, `bi_dre_regras`, `bi_dre_estrutura`.
- Não tocar em `dre-matriz` além de recarregar via React Query.
- Não criar nenhuma regra ampla automaticamente sem o usuário marcar escopo `REGRA_DEFINITIVA` e ser aprovada.

### Arquivos

Criar: `DreClassificarModal.tsx`, `dreClassificarApi.ts`, `DreAprovacoesPage.tsx`, `docs/backend-bi-contabilidade-dre-classificar.md`, migração `bi_dre_classificacoes`.
Editar: `DreDrillDrawer.tsx`, `App.tsx`, `AppSidebar.tsx`, `docs/backend-bi-contabilidade-dre-drill.md`, `mem/features/dre-excecoes.md`.

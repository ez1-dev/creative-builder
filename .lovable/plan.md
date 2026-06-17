
## Parametrização DRE (de/para conta + centro de custos)

Objetivo: classificar lançamentos da DRE por `cd_conta_contabil + cd_centro_custos → cd_mascara_dre` numa tabela própria do Cloud, mantida por uma tela admin. O drill da DRE ganha botão **"Criar regra de classificação"** quando o lançamento estiver `NAO_CLASSIFICADO`, evitando uso de exceção por lançamento para casos resolvíveis por de/para.

A DRE continua consumindo `GET /api/bi/contabilidade/dre-matriz` — nenhuma consulta UpQuery/Oracle no Lovable.

---

### 1. Lovable Cloud (migração)

Nova tabela `public.bi_dre_depara_conta_ccu`:

- `cd_conta_contabil text not null`
- `cd_centro_custos text not null` — valor literal `'TODAS'` representa regra geral
- `cd_mascara_dre text not null`
- `descricao text`
- `ativo boolean not null default true`
- auditoria: `criado_por`, `criado_em`, `atualizado_em`
- `unique (cd_conta_contabil, cd_centro_custos)` (case-insensitive via expressão `upper(...)`)
- índices em `cd_conta_contabil`, `cd_centro_custos`, `cd_mascara_dre`

GRANT `select/insert/update/delete` para `authenticated`, `all` para `service_role`. RLS:
- `select`: qualquer authenticated
- `insert/update/delete`: somente admin (`has_role(auth.uid(),'admin')`) — mesmo padrão das outras tabelas de parametrização DRE
- Trigger `update_updated_at_column`

Não mexer em `bi_dre_mascara`, `bi_dre_estrutura`, `bi_dre_excecoes`, `bi_dre_classificacoes`.

---

### 2. Backend (apenas especificação em `docs/`)

Atualizar `docs/backend-bi-contabilidade-dre-matriz.md` e `docs/backend-bi-contabilidade-dre-drill.md`:

- A RPC/consulta que monta a DRE passa a aplicar o de/para com prioridade:
  1. `bi_dre_classificacoes` (LANCAMENTO > DOCUMENTO > COMBINACAO > REGRA_DEFINITIVA aprovada)
  2. `bi_dre_excecoes` ativa
  3. `bi_dre_depara_conta_ccu` ativa com `(cd_conta_contabil, cd_centro_custos)` exato
  4. `bi_dre_depara_conta_ccu` ativa com `(cd_conta_contabil, 'TODAS')`
  5. `bi_dre_mascara` (regra existente)
  6. fallback `NAO_CLASSIFICADO`
- O drill `LANCAMENTO` retorna campos já existentes + `cd_centro_custos` e `cd_mascara_sugerida` (máscara que `bi_dre_mascara` daria, se houver) para preencher o modal de criação de regra.
- Nada de regra automática — toda inserção parte de ação explícita do usuário.

Não criar endpoint de manutenção: a tela admin grava direto no Cloud via `supabase-js` (RLS controla acesso).

---

### 3. Frontend

**Nova página `/bi/contabilidade/dre/parametrizacao`** — `src/pages/bi/contabilidade/DreParametrizacaoPage.tsx`:

- Tabela paginada das regras de `bi_dre_depara_conta_ccu` com colunas: Conta, Centro de Custos (badge "TODAS" quando geral), Máscara DRE (com descrição), Descrição, Ativo, Ações.
- Filtros: busca por conta, por centro de custos, por máscara DRE, toggle "apenas ativos".
- Botões: **Nova regra**, **Editar**, **Ativar/Desativar**, **Excluir** (com confirm).
- Modal de criação/edição (`DreDeParaModal.tsx`): inputs `cd_conta_contabil`, `cd_centro_custos` (com checkbox "Aplicar a todos os centros de custos" → grava `TODAS`), select `cd_mascara_dre` com as 9 opções listadas pelo usuário, `descricao`, `ativo`. Valida unicidade `(conta, centro)`.
- Ordenação padrão: específicas antes de `TODAS`, depois conta.

**API helper `src/lib/bi/dreDeparaApi.ts`** — `listarRegras`, `criarRegra`, `atualizarRegra`, `alternarAtivo`, `excluirRegra` via `supabase` client.

**Constante compartilhada `DRE_MASCARAS_DEPARA`** com as 9 máscaras (`01.00.000` … `49.00.000`) e suas descrições, usada no select tanto da tela admin quanto do modal do drill.

**Drill — `DreDrillDrawer.tsx`**: quando `tipo_drill === 'LANCAMENTO'` e `codigo_linha === 'NAO_CLASSIFICADO'`, adicionar botão **"Criar regra"** (ícone `Wand2`) ao lado de "Exceção" e "Classificar". Abre novo `DreCriarRegraDeparaModal.tsx` pré-preenchido com `cd_conta_contabil`, `cd_centro_custos`, `cd_mascara` atual (read-only), histórico e valor, mais select de máscara DRE destino. Checkbox "Aplicar a todos os centros de custos da conta" para gravar como `TODAS`. Após salvar: invalidate `dre-matriz` + drill atual; toast "Regra criada — DRE será reclassificada".

**Sidebar / App.tsx**: adicionar rota e item "Parametrização DRE" em Contabilidade (junto com Aprovações e Exceções).

**`mem/features/dre-excecoes.md`**: atualizar registrando que de/para conta+centro é a via preferencial; exceção/lançamento fica para casos pontuais.

---

### 4. Não fazer

- Não consultar UpQuery/Oracle do frontend.
- Não criar regra geral automaticamente — sempre via ação explícita.
- Não tocar em `bi_dre_mascara`, `bi_dre_estrutura`.
- Não usar exceção por lançamento quando o caso couber em de/para conta+centro.

---

### Arquivos

Criar: migração `bi_dre_depara_conta_ccu`, `src/pages/bi/contabilidade/DreParametrizacaoPage.tsx`, `src/components/bi/contabilidade/DreDeParaModal.tsx`, `src/components/bi/contabilidade/DreCriarRegraDeparaModal.tsx`, `src/lib/bi/dreDeparaApi.ts`.

Editar: `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/components/bi/contabilidade/DreDrillDrawer.tsx`, `docs/backend-bi-contabilidade-dre-matriz.md`, `docs/backend-bi-contabilidade-dre-drill.md`, `mem/features/dre-excecoes.md`.

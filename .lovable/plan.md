## Tela: Sincronização De/Para DRE

Nova página administrativa em **Contabilidade/BI** para orquestrar a sincronização do De/Para DRE entre o ERP Senior (via API FastAPI) e a tabela `public.bi_dre_depara_conta_ccu` no Lovable Cloud.

### Premissas confirmadas
- Frontend nunca acessa Oracle/UpQuery nem SQL Server direto.
- Frontend usa apenas: (a) endpoints FastAPI com `Authorization: Bearer <token>`, (b) `supabase-js` com anon key (somente leitura de `bi_dre_depara_conta_ccu`).
- Nenhum uso de `SUPABASE_SERVICE_ROLE_KEY`.
- UpQuery permanece apenas como referência visual (aviso fixo).

### Arquivos a criar/alterar

1. **`src/pages/bi/contabilidade/DreSincronizacaoDeparaPage.tsx`** (nova)
   - Layout com 4 cards + banner de aviso fixo no topo.
   - Estado local (`useState`) para: loading por card, resultados, erro, debug expansível.

2. **`src/lib/bi/dreSincronizacaoApi.ts`** (novo)
   - `buscarTabelasCandidatasErp()` → `GET /api/admin/erp/tabelas-candidatas-dre`
   - `buscarColunasCandidatasErp()` → `GET /api/admin/erp/colunas-candidatas-dre`
   - `sincronizarDeparaDreErp()` → `POST /api/bi/contabilidade/sync-depara-dre`
   - `validarDeparaSupabase()` → consulta direta `bi_dre_depara_conta_ccu` via `supabase-js`: total ativos, contas distintas, centros distintos, agrupado por `cd_mascara_dre`, últimos 20 `updated_at`.
   - Todas as funções retornam `{ dados: T[], ... }` com normalização defensiva (`Array.isArray(...) ? ... : []`).

3. **`src/App.tsx`** — adicionar rota `/bi/contabilidade/dre/sincronizacao-depara` apontando para a nova página (com `ProtectedRoute path="/bi/contabilidade/dre"`).

4. **`src/components/AppSidebar.tsx`** — adicionar item de menu "Sincronização De/Para DRE" sob Contabilidade → DRE.

5. **`docs/backend-bi-contabilidade-sync-depara-dre.md`** (novo) — spec dos 3 endpoints FastAPI esperados (entrada, saída, headers, exemplos), para o time backend implementar.

6. **`mem/features/dre-depara-conta-ccu.md`** — atualizar adicionando a nova tela admin e o fluxo de sincronização ERP→Cloud.

### Cards (detalhe)

**Card 1 — Fonte oficial** (informativo)
- Fonte: `ERP Senior / SQL Server` · Destino: `Supabase / bi_dre_depara_conta_ccu`
- Última sincronização e total: lidos de `localStorage` (`dre-depara-ultima-sync`) gravados após sucesso. Sem backend novo.

**Card 2 — Diagnóstico ERP**
- 2 botões → preenchem `DataTable` separados.
- Empty state: "Nenhuma tabela/coluna candidata encontrada no ERP."

**Card 3 — Sincronização**
- Botão principal com loading "Sincronizando dados do ERP Senior para o Supabase...".
- Sucesso → exibe `message`, `origem`, `destino`, `total_registros`, timestamp local. Grava em `localStorage`. **Chama validação Supabase automaticamente.** Mostra botão "Recarregar DRE" que navega para `/bi/contabilidade/dre`.
- Erro → alerta amigável + `<details>` com stack/payload técnico.

**Card 4 — Validação Supabase**
- Botão "Validar tabela De/Para no Supabase".
- 4 KPIs (total ativos / contas distintas / centros distintos / nº máscaras) + tabela agrupada por `cd_mascara_dre` + tabela últimos atualizados.
- Usa `supabase.from('bi_dre_depara_conta_ccu').select(...)` — RLS já permite SELECT a authenticated.

### Aviso fixo
Banner amarelo/info no topo: "Importante: esta sincronização usa o ERP Senior como fonte oficial. O UpQuery não é utilizado como origem de dados, apenas como referência de conferência."

### Padrões a respeitar
- Tokens semânticos (sem `text-white`/`bg-black` hardcoded).
- Componentes `Card`, `Button`, `DataTableBI`, `Alert` do design system existente.
- Header `ngrok-skip-browser-warning: true` (padrão da `lib/api.ts`).
- Toda resposta validada com `Array.isArray` antes de `.length`/`.map`.

### Fora de escopo
- Implementar endpoints FastAPI (entregues como spec em `docs/`).
- Alterar a tela DRE existente ou a RPC de matriz.
- Mexer em RLS de `bi_dre_depara_conta_ccu` (já existente).

# Backend — Sincronização De/Para DRE (ERP Senior → Lovable Cloud)

Endpoints consumidos pela tela `/bi/contabilidade/dre/sincronizacao-depara`. Todos exigem JWT do ERP no header `Authorization: Bearer <token>` e respondem JSON.

> ⚠️ **Fonte oficial é o ERP Senior (SQL Server).** Oracle/UpQuery NÃO devem ser consultados em nenhum desses endpoints. O frontend nunca acessa o banco do ERP direto e nunca usa `SUPABASE_SERVICE_ROLE_KEY`; quem escreve em `bi_dre_depara_conta_ccu` é o backend FastAPI usando service role server-side.

---

## 1. `GET /api/admin/erp/tabelas-candidatas-dre`

Retorna as tabelas do ERP Senior que podem servir como origem do De/Para DRE (heurística por nome: `%DEPARA%DRE%`, `%DRE%CONTA%`, etc.).

**Resposta**
```json
{
  "dados": [
    { "schema_name": "R034", "table_name": "DEPARA_DRE_CONTA_CCU" },
    { "schema_name": "BENNER", "table_name": "DRE_CONTA_CENTRO" }
  ]
}
```

Empty: `{ "dados": [] }`.

---

## 2. `GET /api/admin/erp/colunas-candidatas-dre`

Lista colunas das tabelas candidatas que parecem mapear conta contábil, centro de custos e máscara DRE.

**Resposta**
```json
{
  "dados": [
    { "schema_name": "R034", "table_name": "DEPARA_DRE_CONTA_CCU", "column_name": "CD_CONTA_CONTABIL" },
    { "schema_name": "R034", "table_name": "DEPARA_DRE_CONTA_CCU", "column_name": "CD_CENTRO_CUSTOS" },
    { "schema_name": "R034", "table_name": "DEPARA_DRE_CONTA_CCU", "column_name": "CD_MASCARA_DRE" }
  ]
}
```

---

## 3. `POST /api/bi/contabilidade/sync-depara-dre`

Lê o De/Para oficial do ERP Senior e faz **UPSERT** em `public.bi_dre_depara_conta_ccu` no Lovable Cloud usando a service role no servidor.

**Request**: body vazio `{}`.

**Resposta (sucesso)**
```json
{
  "success": true,
  "origem": "ERP Senior SQL Server",
  "destino": "Supabase.bi_dre_depara_conta_ccu",
  "total_registros": 250,
  "message": "De/para DRE sincronizado do ERP para o Supabase com sucesso."
}
```

**Resposta (erro)**: HTTP 4xx/5xx com `{ "detail": "mensagem amigável" }`.

### Regras de upsert
- Chave: `(upper(cd_conta_contabil), upper(cd_centro_custos))`.
- Campos atualizados: `cd_mascara_dre`, `descricao`, `ativo = true`, `updated_at = now()`.
- Registros que existem no Cloud mas não no ERP devem ser marcados `ativo = false` (soft-delete) — **não excluir**.
- `criado_por` permanece o valor anterior; novos registros recebem `NULL` (origem ERP).
- Após o upsert, enviar `NOTIFY pgrst, 'reload schema'` apenas se houver mudança de schema; nesse fluxo não é necessário.

### Segurança
- O endpoint exige usuário autenticado **com perfil admin** (mesmo critério de `/bi/contabilidade/dre/parametrizacao`).
- Toda escrita em `bi_dre_depara_conta_ccu` ocorre via service role do Supabase, server-side. O frontend não conhece a service role.

---

## Validação no Cloud (sem endpoint backend)

A tela usa `supabase-js` com a **anon key** para ler `bi_dre_depara_conta_ccu` (RLS já libera SELECT para `authenticated`). Não é necessário endpoint adicional.

## Objetivo

Separar responsabilidades de forma definitiva:

- **FastAPI**: somente lê o ERP Senior. Não precisa de `SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY`. Não escreve no Cloud.
- **Lovable Cloud**: dono da fila, capacidades, prioridade e programação. Puxa dados do ERP via Edge Function chamando o endpoint da FastAPI.

```text
ERP Senior
    │
    ▼
FastAPI  ──GET /api/producao/programacao/fila-erp──►  Edge Function (programacao-sync-fila)
                                                              │ upsert
                                                              ▼
                                                       bi_ops_fila (Cloud)
                                                              │
                  ┌───────────────────────────────────────────┤
                  ▼                                           ▼
       Edge Function programacao-gerar              Frontend /producao/programacao
       (lê fila + capacidades + prioridade,
        grava programacao_agenda)
```

## Decisões confirmadas

- Mantemos os nomes atuais: `bi_ops_fila`, `programacao_capacidades`, `programacao_agenda`. Nada de rename.
- Sync da fila: botão manual na UI **+** `pg_cron` a cada 15 min.
- `producao_prioridade_op`: nova tabela para PCP sobrescrever a prioridade vinda do ERP (sem resposta explícita, sigo com escopo mínimo — pode ajustar depois).

## Mudanças

### 1. Contrato FastAPI (somente leitura ERP)

Documento `docs/backend-fila-erp.md` (novo) especificando o único endpoint que a Edge Function consome:

```
GET /api/producao/programacao/fila-erp
  ?codemp=1
  &situacoes=A,L
  &unidade_negocio=...
  &codcre=...
  &limit=5000
Headers: ngrok-skip-browser-warning: true
```

Response:
```json
{
  "dados": [
    {
      "codemp": 1,
      "numorp": "12345",
      "codori": "001",
      "codpro": "PRD-001",
      "descricao_produto": "...",
      "codcre": "C100",
      "descre": "Centro X",
      "codopr": "10",
      "descricao_operacao": "...",
      "tipo_recurso": "MAQUINA",
      "unidade_negocio": "UN1",
      "situacao": "A",
      "quantidade_prevista": 100,
      "tempo_previsto_min": 240,
      "prioridade": 5,
      "data_geracao_op": "2026-05-20"
    }
  ],
  "total_registros": 1
}
```

Regras:
- FastAPI lê **só** do ERP, sem cliente Supabase.
- Removidas dependências `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` desse fluxo de programação.
- Outros endpoints já existentes do BI (compras/recebimentos) continuam usando o ETL atual — fora do escopo desta mudança.

### 2. Nova tabela `producao_prioridade_op` (Cloud)

Sobrescreve a prioridade do ERP por OP. Escopo mínimo:

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| codemp | int | |
| numorp | text | |
| prioridade | int | menor = mais urgente |
| observacao | text | |
| atualizado_por | uuid | auth.uid() |
| created_at / updated_at | timestamptz | |

- Unique (`codemp`, `numorp`).
- RLS: read `authenticated`; ALL para admins (mesmo padrão das outras tabelas de produção).
- `programacao-gerar` faz LEFT JOIN: se houver linha aqui, usa essa prioridade no lugar da do `bi_ops_fila`.

### 3. Nova Edge Function `programacao-sync-fila`

`supabase/functions/programacao-sync-fila/index.ts`

Fluxo:
1. Valida JWT (igual a `programacao-gerar`).
2. Lê secrets `FASTAPI_BASE_URL` e (opcional) `FASTAPI_TOKEN`.
3. Faz `GET {FASTAPI_BASE_URL}/api/producao/programacao/fila-erp` com `ngrok-skip-browser-warning: true`.
4. UPSERT em `bi_ops_fila` com `on_conflict='codemp,numorp,codopr'` (precisa de unique index; ver migração abaixo).
5. **Reconcilia**: marca como `situacao='X'` (ou deleta) OPs que não vieram mais do ERP, dentro do mesmo filtro (snapshot completo).
6. Grava linha em `etl_execucoes` com tarefa_codigo `SYNC_FILA_OPS_ERP` (linhas lidas/inseridas/atualizadas/erro).
7. Retorna `{ lidas, inseridas, atualizadas, removidas, duracao_ms }`.

### 4. Migração SQL

- Cria tabela `producao_prioridade_op` + RLS + trigger `updated_at`.
- Garante unique index em `bi_ops_fila (codemp, numorp, codopr)` (caso não exista) — necessário para o upsert.
- Permite INSERT/UPDATE/DELETE em `bi_ops_fila` **apenas** via service role (RLS já bloqueia authenticated, ok).

### 5. Cron `pg_cron` (executado via supabase insert, não migration)

```sql
select cron.schedule(
  'sync-fila-ops-erp',
  '*/15 * * * *',
  $$ select net.http_post(
       url := '{PROJECT_URL}/functions/v1/programacao-sync-fila',
       headers := '{"Content-Type":"application/json","apikey":"{ANON_KEY}","Authorization":"Bearer {ANON_KEY}"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```

Mas como a edge function exige JWT de usuário, vou aceitar duas opções no código:
- chamada de usuário (JWT normal) → usada pela UI;
- chamada com `apikey` + header `x-cron-secret` → usada pelo pg_cron, sem precisar de JWT de usuário.

`CRON_SECRET` vira novo secret.

### 6. Frontend

- `src/lib/producao/programacaoApi.ts`: adiciona `programacaoApi.syncFila()` chamando `supabase.functions.invoke('programacao-sync-fila')`.
- `src/lib/producao/programacaoApi.ts`: ao montar payload de `gerar()`, nada muda — a edge function passa a aplicar prioridade override.
- `src/components/producao/programacao/ProgramacaoFiltersBar.tsx` (ou onde houver o botão "Atualizar"): novo botão **"Atualizar fila do ERP"** que chama `syncFila()` e mostra toast com `inseridas/atualizadas/removidas`.
- Nova mini aba ou seção **"Prioridade manual"** para CRUD de `producao_prioridade_op` (lista filtrada + edit inline). Escopo mínimo, sem dashboard.

### 7. Ajustes em `programacao-gerar`

- Antes de processar a fila, faz `select` em `producao_prioridade_op` e cria um `Map<codemp|numorp, prioridade>`.
- Substitui `op.prioridade` pelo override quando existir.
- Mantém ordenação por `(prioridade, data_geracao_op)`.

### 8. Secrets a configurar

- `FASTAPI_BASE_URL` (ex.: `https://xxxx.ngrok-free.app`)
- `CRON_SECRET` (string aleatória)

## Fora de escopo

- Renomear tabelas existentes.
- Algoritmo APS regressivo/cenários (Fase 2/3 do plano anterior).
- IA interpretativa (Fase 4).
- Mudar ETL de compras/recebimentos.

## Próximo passo

Aprovar para eu (1) rodar a migração, (2) criar a edge function `programacao-sync-fila`, (3) adicionar botão na UI + CRUD de prioridade, (4) ajustar `programacao-gerar`, (5) configurar pg_cron.

**Confirma o escopo mínimo de `producao_prioridade_op` (só `codemp+numorp → prioridade+observacao`)?** Se precisar de mais campos (ex.: prioridade por projeto/cliente, validade, motivo), me diz antes de eu rodar a migração.

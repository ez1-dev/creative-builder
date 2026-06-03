# Plano — Configuração híbrida do FastAPI (entrega externa)

**Escopo confirmado:** só arquivos para você colar no repositório do **FastAPI**. Nada será alterado neste projeto Lovable. O frontend continua apontando para o Cloud atual (`cpgyhjqufxeweyswosuw`) — quem fala com o Supabase novo (`razvdopgxoiqucupmpxq`) é só o backend.

> ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` colada no chat deve ser **rotacionada antes de subir** o backend. Use a chave nova ao preencher o `.env`.

---

## 1. Arquivo para você criar: `fastapi/.env`

Conteúdo idêntico ao que você passou, com placeholders ONPREM/CLOUD preservados:

```env
# === Supabase (controle da aplicação) ===
SUPABASE_URL=https://razvdopgxoiqucupmpxq.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_app0bEVB8HmHKxFYOwPjiQ_bi31bRa5
SUPABASE_SERVICE_ROLE_KEY=<COLAR_CHAVE_NOVA_APOS_ROTACIONAR>

# === Modo da aplicação ===
APP_AMBIENTE=producao
APP_MODE=hybrid
DB_MODE=hybrid

# === ERP on-premise (SAPIENS) ===
ONPREM_DB_ENABLED=true
ONPREM_DB_TYPE=sqlserver
ONPREM_DB_HOST=SEU_HOST_ONPREMISE
ONPREM_DB_PORT=1433
ONPREM_DB_DATABASE=SAPIENS
ONPREM_DB_USER=SEU_USUARIO
ONPREM_DB_PASSWORD=SUA_SENHA
ONPREM_DB_DRIVER=ODBC Driver 18 for SQL Server
ONPREM_DB_TRUST_CERTIFICATE=yes

# === Origem cloud (desligada por enquanto) ===
CLOUD_DB_ENABLED=false
CLOUD_DB_TYPE=sqlserver
CLOUD_DB_HOST=
CLOUD_DB_PORT=1433
CLOUD_DB_DATABASE=
CLOUD_DB_USER=
CLOUD_DB_PASSWORD=
CLOUD_DB_DRIVER=ODBC Driver 18 for SQL Server
CLOUD_DB_TRUST_CERTIFICATE=yes

# === Limites do preview de SQL no /etl ===
ETL_SQL_PREVIEW_TIMEOUT_SECONDS=15
ETL_SQL_PREVIEW_MAX_ROWS=500
ETL_SQL_PREVIEW_DEFAULT_ROWS=100
ETL_BLOCK_DML_DDL=true
```

## 2. Arquivo `fastapi/.env.example` (versionado, sem segredos)

Mesma estrutura, com placeholders genéricos em **todos** os campos sensíveis (`SUPABASE_*`, `ONPREM_DB_*`, `CLOUD_DB_*`).

## 3. Atualização do `fastapi/.gitignore`

Garantir que estas linhas existam:
```
.env
.env.local
.env.*.local
*.env
```

## 4. Frontend Lovable — **nenhuma mudança**

- O `.env` atual (gerado pelo Lovable) já tem `VITE_SUPABASE_URL=https://cpgyhjqufxeweyswosuw.supabase.co` e a publishable key correta. **Não toco nele** (é auto-gerado).
- Vite **ignora** variáveis `NEXT_PUBLIC_*` — então o `.env.local` que você pediu não teria efeito aqui. Se algum dia o frontend precisar falar com o Supabase novo, a forma certa seria criar uma edge function intermediária. Por ora, fica fora de escopo.

## 5. Patch Python do FastAPI (entrega como arquivos prontos para colar)

### 5.1 `fastapi/app/core/config.py` (ou equivalente)
- Carregar `.env` com `python-dotenv` no boot (`load_dotenv()` em `main.py` antes dos imports de settings).
- Adicionar pydantic-settings (ou os.getenv) para as novas chaves: `APP_MODE`, `DB_MODE`, `ONPREM_DB_*`, `CLOUD_DB_*`, `ETL_SQL_PREVIEW_*`, `ETL_BLOCK_DML_DDL`.
- Helper `get_supabase_admin()` retornando um `supabase.Client` criado com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** logar a chave.

### 5.2 `fastapi/app/db/router.py` — seletor de conexão híbrida
- Função `get_erp_engine()` que retorna a engine on-prem se `ONPREM_DB_ENABLED=true`, cloud se `CLOUD_DB_ENABLED=true`. Em modo `hybrid` prioriza on-prem e cai pra cloud só se desabilitado. Connection string SQL Server via pyodbc:
  ```
  mssql+pyodbc:///?odbc_connect=...DRIVER={ODBC Driver 18 for SQL Server};SERVER=...;DATABASE=...;UID=...;PWD=...;TrustServerCertificate=yes
  ```

### 5.3 `fastapi/app/routers/etl.py` — endpoint `POST /api/etl/acoes/{id_acao}/testar-sql`

Comportamento:
1. **Auth**: valida JWT do Supabase (mesmo padrão dos outros endpoints admin).
2. **Buscar a ação no Supabase** via service role:
   ```python
   sb = get_supabase_admin()
   row = sb.table("etl_acoes").select("*").eq("id_acao", id_acao).single().execute().data
   ```
3. **SQL a testar**: usa `payload.sql_template` se enviado; senão `row["sql_template"]`.
4. **Validação anti-DML/DDL** (ativa quando `ETL_BLOCK_DML_DDL=true`):
   - Tira comentários (`--...` e `/* ... */`).
   - Quebra em statements por `;` ignorando vazios → exige **exatamente 1**.
   - Primeira palavra deve ser `SELECT` ou `WITH` (case-insensitive).
   - Rejeita se aparecer fora de string literal qualquer regex `\b(INSERT|UPDATE|DELETE|MERGE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|BACKUP|RESTORE|BULK|sp_|xp_)\b`.
   - Retorna HTTP 400 com mensagem clara em caso de violação.
5. **Substituição de placeholders**: usa o mesmo helper de `placeholders.py` (ANOMES_*, etc.) recebendo `payload.parametros`.
6. **Limite de linhas**: `min(payload.limite or ETL_SQL_PREVIEW_DEFAULT_ROWS, ETL_SQL_PREVIEW_MAX_ROWS)`. Encapsula:
   ```sql
   SELECT TOP (:lim) * FROM (<sql_do_usuario>) AS preview
   ```
7. **Timeout**: executa em thread com `asyncio.wait_for(..., timeout=ETL_SQL_PREVIEW_TIMEOUT_SECONDS)`; em estouro → HTTP 408 com `tempo_ms`.
8. **Resposta** compatível com `TestarSqlResponse` que o frontend já espera:
   ```json
   { "colunas":[{"nome":"x","tipo":"int"}], "linhas":[...], "qtd_linhas":N, "tempo_ms":123, "truncado":true|false }
   ```

### 5.4 Execuções ETL — aceitar `parametros` no body

Endpoints afetados:
- `POST /api/etl/tarefas/{nome}/executar`
- `POST /api/etl/acoes/{id_acao}/executar`

Schema Pydantic:
```python
class ExecucaoParams(BaseModel):
    anomes_ini: int
    anomes_fim: int
    acionado_por: str | None = None
    parametros: dict[str, str | int] | None = None
```

- Mesclar `parametros` (custom do usuário) com `{"ANOMES_INI":..., "ANOMES_FIM":...}` (sem deixar o custom sobrescrever os obrigatórios — ou sobrescrever, conforme a regra que você definir; padrão sugerido: **obrigatórios vencem**).
- Persistir o dicionário final na coluna `etl_execucoes.parametros` (jsonb).
- Repassar para o resolvedor de placeholders na hora de rodar o SQL.

---

## Detalhes técnicos — checklist de segurança

- `SUPABASE_SERVICE_ROLE_KEY` lida **só** em `config.py` do backend; nunca retornada em response, nunca logada.
- Cliente Supabase admin instanciado uma única vez (singleton) para não vazar via repr em stack traces.
- Logs do `testar-sql` registram só: usuário, id_acao, tempo_ms, qtd_linhas, truncado. **Nunca** o SQL completo nem dados das linhas.
- O frontend Lovable não precisa de nenhuma mudança — `src/lib/etl/api.ts` já manda `sql_template`, `parametros` e `limite` no payload de `testarSqlAcao`, e a `ExecucaoParams` no TS já contempla `parametros?: Record<string, string | number>`.

---

## O que será entregue na próxima mensagem (após você aprovar)

1. Conteúdo final de `.env`, `.env.example` e bloco para `.gitignore`.
2. Arquivos Python prontos: `config.py`, `db/router.py`, `routers/etl.py` (com endpoints `testar-sql`, `executar` tarefa e ação).
3. Snippet de teste rápido (curl) para validar `testar-sql` e bloqueio de DML/DDL.

Nada será gravado dentro deste repositório Lovable — vou te entregar tudo como texto para colar no repo do FastAPI.
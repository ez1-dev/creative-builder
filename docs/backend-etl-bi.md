# ETL — Camada analítica BI no Lovable Cloud (Supabase)

> Especificação para o time do FastAPI. Frontend Lovable já tem as tabelas, RLS e a tela `/etl`. Falta o serviço de ETL real.

## Arquitetura

```text
ERP Senior (SQL Server / Oracle)
        │  pyodbc / oracledb
        ▼
FastAPI ETL  ──► Supabase (tabelas bi_*) via service role
        │              │
        │              ▼
        │       /api/painel-compras*, /api/notas-recebimento*
        │              │
        ▼              ▼
   etl_logs        Lovable / React
```

Frontend **nunca** acessa o ERP. As APIs agregadas passam a consultar `bi_compras` / `bi_recebimentos` no Supabase.

## Variáveis de ambiente do backend

- `SUPABASE_URL` (mesma URL do projeto Lovable Cloud)
- `SUPABASE_SERVICE_ROLE_KEY` (somente backend; bypassa RLS)
- `SENIOR_DB_HOST`, `SENIOR_DB_PORT`, `SENIOR_DB_USER`, `SENIOR_DB_PASSWORD`, `SENIOR_DB_DATABASE`
- (ou equivalentes por conexão configurada em `etl_conexoes`)

## Tabelas que o backend usa

Já criadas no Supabase. Nomes e contratos:

### Fatos (escrita pelo ETL)
- `bi_compras` — chave única `(numero_oc, sequencia_item)`. UPSERT.
- `bi_recebimentos` — chave única `(numero_nf, serie, sequencia_item, codigo_fornecedor)`. UPSERT.

### Dimensões (escrita pelo ETL)
- `bi_fornecedores` (PK `codigo`)
- `bi_projetos` (PK `numero_projeto`, com `projeto_macro` já classificado)
- `bi_centros_custo` (PK `codigo`)
- `bi_tipo_despesa` (já populada com 4 categorias)

### Orquestração (leitura/escrita do ETL)
- `etl_tarefas` — definição (`codigo`, `cron`, `enabled`, `params`, `conexao_id`)
- `etl_conexoes` — `secret_key` é o NOME da env var no backend; senha NUNCA é gravada
- `etl_execucoes` — uma linha por execução; status `RUNNING|SUCCESS|ERROR|CANCELLED`
- `etl_logs` — logs detalhados, FK para execução
- `etl_watermark` — `(tarefa_codigo, ultimo_valor, tipo)`. Tipo `TIMESTAMP|ID|MES`
- `etl_fila_integrador` — fila de reprocessamento manual

## Tarefas iniciais

### ATU_COMPRAS (cron `*/15 * * * *`)

1. Lê `etl_watermark` da tarefa (timestamp do último `data_alteracao` processado).
2. Query no ERP filtrando `data_alteracao > watermark` (ou janela de `params.janela_dias` no primeiro carregamento).
3. Para cada linha: aplica classificação **idêntica** a `src/lib/comprasClassificacao.ts`:
   - `projeto_macro` (regras em `docs/backend-projeto-macro.md`)
   - `tipo_despesa_calc` (regras em `docs/backend-painel-compras-dashboard.md` § "Classificação de tipo_despesa")
4. Calcula:
   - `valor_bruto = quantidade * preco_unitario` (ou campo do ERP)
   - `valor_liquido` = bruto menos descontos
   - `valor_recebido = quantidade_recebida * preco_unitario`
   - `valor_pendente = saldo_pendente * preco_unitario`
   - `mes_competencia = SUBSTRING(COALESCE(mes_competencia, data_emissao, data_recebimento), 1, 7)`
5. UPSERT em `bi_compras` em batches de `params.batch_size` (default 2000) com `on_conflict="numero_oc,sequencia_item"`.
6. Atualiza watermark com `MAX(data_alteracao)` processado.

### ATU_RECEBIMENTOS (cron `*/15 * * * *`)

> ⚠️ **Fonte correta**: usar a MESMA base que o endpoint `consultar_notas_recebimento` (`/api/notas-recebimento`) já consulta hoje em produção — família **`E440NFC` (cabeçalho de NF de entrada) + `E440IPC` (itens) + `E440ISC` (impostos)** e tabelas equivalentes para devolução/cancelamento.
>
> **NÃO** usar `E140NFV` / `E140IPV` — essas são notas de **saída/venda** e produziriam números errados no BI.
>
> Critério prático: reaproveitar a query SQL de `consultar_notas_recebimento`, trocando paginação por filtro de watermark (`data_alteracao > :watermark`). Isso garante paridade automática entre o BI e o endpoint atual.

Mesma estrutura do ATU_COMPRAS. Diferenças:
- Watermark sobre `data_alteracao` da NF (E440NFC).
- Determinar `tipo_movimento`:
  - `RECEBIMENTO` (default)
  - `DEVOLUCAO` se flag de devolução
  - `ESTORNO` se `estornada = true`
  - `CANCELAMENTO` se `cancelada = true`
- Vincular `numero_oc_origem`, `sequencia_oc_origem` a partir dos campos do E440IPC que apontam para a OC origem.
- UPSERT com chave `(numero_nf, serie, sequencia_item, codigo_fornecedor)`.

## Feature flags em `etl_configuracoes_bi`

As flags vivem na tabela `etl_configuracoes_bi` no Lovable Cloud (não em env var). O backend lê via service role com cache curto (~30s) e a tela `/etl` aba **Configuração BI** controla os valores.

Chaves:

| Chave                           | Tipo  | Default  | Efeito                                                                 |
|---------------------------------|-------|----------|------------------------------------------------------------------------|
| `USE_BI_ANALYTICS_COMPRAS`      | bool  | `false`  | `/api/painel-compras*` lê de `bi_compras` quando `true`                |
| `USE_BI_ANALYTICS_RECEBIMENTOS` | bool  | `false`  | `/api/notas-recebimento*` lê de `bi_recebimentos` quando `true`        |
| `FALLBACK_TO_ERP_WHEN_BI_EMPTY` | bool  | `true`   | Se BI vazio: `true` cai pro ERP, `false` retorna HTTP 409              |
| `USE_DASHBOARD_CACHE`           | bool  | `false`  | Habilita lookup em `dashboard_cache` antes de recomputar               |
| `DASHBOARD_CACHE_TTL_MINUTES`   | int   | `5`      | TTL do cache em minutos                                                |

```python
def get_flag(chave: str, default: str) -> str:
    # cache 30s em memória; consulta supabase.from("etl_configuracoes_bi")
    return _cache.get_or_load(chave, default)

def fonte_compras(filtros):
    if get_flag("USE_BI_ANALYTICS_COMPRAS", "false") == "true":
        if supabase.count("bi_compras") == 0:
            if get_flag("FALLBACK_TO_ERP_WHEN_BI_EMPTY", "true") == "true":
                return query_erp_compras(filtros)
            raise HTTPException(409, "Base analítica ainda não populada.")
        return query_bi_compras(filtros)
    return query_erp_compras(filtros)
```

Aplicar em: `/api/painel-compras`, `/api/painel-compras-dashboard`, `/api/notas-recebimento`, `/api/notas-recebimento-dashboard`.

Regras:
- Apenas administradores escrevem na tabela (RLS). Backend usa service role para ler.
- **Não remover** `query_erp_compras` / `query_erp_recebimentos` por pelo menos 7 dias após o cutover.
- Mudança de flag tem efeito imediato após o TTL do cache em memória.

## Sequência de validação V1 (antes de ligar a flag)

1. Configurar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no backend (somente backend).
2. `POST /api/etl/reprocessar { "tarefa": "ATU_COMPRAS", "data_ini": "2026-01-01", "data_fim": "2026-01-31" }`.
3. Conferir no Supabase: `SELECT COUNT(*), SUM(valor_liquido), SUM(quantidade) FROM bi_compras WHERE data_emissao BETWEEN '2026-01-01' AND '2026-01-31';`.
4. Comparar com `GET /api/painel-compras-dashboard?data_inicio=2026-01-01&data_fim=2026-01-31` (ainda lendo do ERP). **Tolerância: divergência ≤ 0,5%**.
5. `POST /api/etl/reprocessar { "tarefa": "ATU_RECEBIMENTOS", "data_ini": "2026-01-01", "data_fim": "2026-01-31" }`.
6. `SELECT COUNT(*), SUM(valor_liquido) FROM bi_recebimentos WHERE data_recebimento BETWEEN '2026-01-01' AND '2026-01-31' AND tipo_movimento = 'RECEBIMENTO';`.
7. Comparar com `GET /api/notas-recebimento-dashboard?data_inicio=...`. Validar `DEVOLUCAO`/`ESTORNO`/`CANCELAMENTO` separadamente.
8. Só após 2 janelas validadas com diff ≤ 0,5% em homologação, ligar `USE_BI_ANALYTICS=true`.

A aba **Validação** em `/etl` no Lovable mostra esses totais lado a lado e o diff em verde/amarelo/vermelho.

## Shadow mode — endpoints `/api/bi/*` paralelos (etapa atual)

**Não trocar** os endpoints atuais ainda. Criar endpoints **paralelos** lendo só de `bi_*`, para comparar ERP × BI sem risco para o frontend principal.

### Endpoints novos (sem alterar os legacy)

| Endpoint shadow                            | Fonte             | Espelha                                  |
|--------------------------------------------|-------------------|------------------------------------------|
| `GET /api/bi/painel-compras`               | `bi_compras`      | `/api/painel-compras`                    |
| `GET /api/bi/painel-compras-dashboard`     | `bi_compras`      | `/api/painel-compras-dashboard`          |
| `GET /api/bi/notas-recebimento`            | `bi_recebimentos` | `/api/notas-recebimento`                 |
| `GET /api/bi/notas-recebimento-dashboard`  | `bi_recebimentos` | `/api/notas-recebimento-dashboard`       |
| `GET /api/export/bi/painel-compras`        | `bi_compras`      | `/api/export/painel-compras`             |
| `GET /api/export/bi/notas-recebimento`     | `bi_recebimentos` | `/api/export/notas-recebimento`          |
| `GET /api/bi/validar-painel-compras`       | ambas             | comparação ERP × BI                      |
| `GET /api/bi/validar-notas-recebimento`    | ambas             | comparação ERP × BI                      |

### Contrato de `/api/bi/validar-*`

Aceitam os mesmos query params do dashboard correspondente (`data_inicio`, `data_fim`, `tipo_despesa`, `somente_pendentes`, `fornecedor`, `projeto_macro`, ...) e retornam:

```json
{
  "filtros": { "data_inicio": "2026-01-01", "data_fim": "2026-01-31", "tipo_despesa": "MATERIA_PRIMA", "somente_pendentes": true },
  "erp": { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0, "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 },
  "bi":  { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0, "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 },
  "diferencas": { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0, "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 }
}
```

Para `validar-notas-recebimento`: trocar `valor_pendente`/`qtd_ocs` por `valor_total`/`qtd_nfs`. Regra: `diferencas[k] = bi[k] - erp[k]`.

### Caso obrigatório de validação

```
?data_inicio=2026-01-01&data_fim=2026-01-31&tipo_despesa=MATERIA_PRIMA&somente_pendentes=true
```

Os 6 KPIs precisam bater ou ter divergência explicável (NF cancelada, item estornado, etc.).

## Cutover faseado (depois da validação shadow)

Só ligar `USE_BI_ANALYTICS=true` quando o caso obrigatório bater. Ordem:

1. Dashboards agregados (`*-dashboard`) → BI.
2. Listas paginadas (`/api/painel-compras`, `/api/notas-recebimento`) → BI.
3. Exportações → BI.
4. Watermark incremental (cron `*/15 * * * *`); reprocessamento manual segue via `/api/etl/reprocessar`.
5. Manter fallback ERP por 7 dias antes de remover `query_erp_*`.

## Endpoints HTTP que o frontend chama

O frontend Lovable chama o FastAPI em:

### `POST /api/etl/executar`
Body: `{ "tarefa": "ATU_COMPRAS", "acionado_por": "MANUAL" }`
- Cria linha em `etl_execucoes` (`acionado_por="MANUAL"`).
- Dispara a tarefa imediatamente (não enfileira).
- Retorna `{ "execucao_id": "..." }`.

### `POST /api/etl/reprocessar`
Body: `{ "tarefa": "ATU_COMPRAS", "data_ini": "2026-01-01", "data_fim": "2026-04-30" }`
- Insere em `etl_fila_integrador` (`status="PENDENTE"`).
- Worker do backend consome a fila, ignora watermark e processa apenas o intervalo.

> Os listings (tarefas, execuções, logs, fila, conexões) o frontend já lê direto do Supabase via RLS de admin. Não precisa expor `GET /api/etl/*`.

## Reescrita das APIs agregadas

Trocar a fonte (sem mudar contrato):

### `GET /api/painel-compras`
```sql
SELECT *, COUNT(*) OVER() AS total_registros
FROM bi_compras
WHERE <filtros aplicados como em painel-compras hoje>
ORDER BY data_emissao DESC
LIMIT :tamanho_pagina OFFSET (:pagina - 1) * :tamanho_pagina
```

### `GET /api/painel-compras-dashboard`
Sem `LIMIT`. Calcula `kpis`, `graficos.*`, `drill` com `SUM`/`COUNT`/`GROUP BY` sobre `bi_compras` (sem precisar reclassificar, porque `projeto_macro` e `tipo_despesa_calc` já vêm prontos).

### `GET /api/notas-recebimento`
Idem, contra `bi_recebimentos` paginado.

### `GET /api/notas-recebimento-dashboard`
Idem, agregações sem paginação.

> **Cache opcional:** antes de calcular o dashboard, hash dos filtros + lookup em `dashboard_cache`. Se `valid_until > now()`, retorna o `payload` direto. TTL sugerido: 5 minutos para queries sem filtro de fornecedor/OC, 60 s para filtros específicos. Limpar entradas vencidas em job separado.

## Fluxo padrão de execução (pseudo-código)

```python
def run(tarefa_codigo: str, acionado_por: str = "SCHEDULER", janela: tuple | None = None):
    exec_id = supa.insert("etl_execucoes", {
        "tarefa_codigo": tarefa_codigo,
        "status": "RUNNING",
        "acionado_por": acionado_por,
    }).id

    try:
        wm = supa.select_one("etl_watermark", tarefa_codigo=tarefa_codigo)
        rows = senior.extract(tarefa_codigo, watermark=wm.ultimo_valor, janela=janela)
        log(exec_id, "INFO", f"extraídas {len(rows)} linhas")

        transformed = [transform(tarefa_codigo, r) for r in rows]
        ins, upd = supa.upsert_batch(target_table_for(tarefa_codigo), transformed,
                                     on_conflict=conflict_key(tarefa_codigo))

        if not janela:  # só avança watermark em execução normal
            new_wm = max(r["erp_updated_at"] for r in rows)
            supa.update("etl_watermark", tarefa_codigo=tarefa_codigo,
                        ultimo_valor=new_wm.isoformat())

        supa.update("etl_execucoes", id=exec_id, status="SUCCESS",
                    terminado_em=now(), linhas_lidas=len(rows),
                    linhas_inseridas=ins, linhas_atualizadas=upd)
    except Exception as e:
        log(exec_id, "ERROR", str(e), {"trace": traceback.format_exc()})
        supa.update("etl_execucoes", id=exec_id, status="ERROR",
                    terminado_em=now(), erro_resumo=str(e)[:500])
        raise
```

## Segurança

- `service_role` apenas no backend. Nunca no React/JS público.
- Senhas de banco em env vars do servidor (ou secret manager). `etl_conexoes.secret_key` guarda só o **nome** da variável.
- Logs **não** podem persistir senhas, connection strings completas ou payloads sensíveis.
- Endpoints `POST /api/etl/*` exigem usuário admin (validar JWT do Supabase + checar `is_admin(auth.uid())`, igual rotas administrativas atuais).

## Retenção

Sugestão de jobs de limpeza no próprio FastAPI:
- `etl_logs` > 30 dias → DELETE
- `etl_execucoes` > 90 dias → DELETE
- `dashboard_cache` `valid_until < now() - interval '1 day'` → DELETE

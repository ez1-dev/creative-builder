
# Validação ETL V1 + cutover controlado por feature flag

Foco: garantir que `bi_compras` e `bi_recebimentos` reflitam o ERP **antes** de qualquer dashboard apontar para a camada BI. Os endpoints atuais continuam consultando o ERP. A troca acontece só depois da validação, atrás da flag `USE_BI_ANALYTICS`.

---

## 1. Configuração do backend FastAPI (sem mudança no Lovable)

Variáveis de ambiente que precisam existir no servidor onde rodam as rotas `/api/painel-compras*` e onde vai morar o ETL:

- `SUPABASE_URL` = mesma URL do Lovable Cloud (já conhecida)
- `SUPABASE_SERVICE_ROLE_KEY` = secret já existente neste projeto (`SUPABASE_SERVICE_ROLE_KEY`)
- `USE_BI_ANALYTICS` = `false` por enquanto (flag de cutover)

`SUPABASE_SERVICE_ROLE_KEY` **só** no backend. Nada disso vai para o React.

---

## 2. Correção em `ATU_RECEBIMENTOS` — usar a mesma base do `consultar_notas_recebimento`

O documento `docs/backend-etl-bi.md` precisa deixar explícito:

- **Não** ler de `E140NFV` / `E140IPV` (essas são saídas/vendas).
- **Ler exatamente** das tabelas que o endpoint atual `/api/notas-recebimento` já usa — base de NF de **entrada/recebimento** (família `E440*`: `E440NFC` cabeçalho, `E440IPC` itens, `E440ISC` impostos, e equivalentes de devolução/cancelamento que o backend já cobre).
- Critério: o ETL **deve reaproveitar a mesma query** que `consultar_notas_recebimento` já valida em produção, só trocando paginação por watermark. Isso elimina divergência por fonte diferente.
- Atualizar a seção "Tarefas iniciais → ATU_RECEBIMENTOS" com essa orientação e remover qualquer menção a `E140*`.

Saída desta etapa: `docs/backend-etl-bi.md` v2 e nota equivalente em `.lovable/plan.md`.

---

## 3. Sequência de validação (executada pelo time do FastAPI, não pelo Lovable)

### 3.1 ATU_COMPRAS — janela pequena

```text
POST /api/etl/reprocessar
{ "tarefa": "ATU_COMPRAS", "data_ini": "2026-01-01", "data_fim": "2026-01-31" }
```

Conferências (executadas via SQL no Supabase pelo Lovable após carga, com `supabase--read_query`):

- `SELECT COUNT(*), SUM(valor_liquido), SUM(quantidade) FROM bi_compras WHERE data_emissao BETWEEN '2026-01-01' AND '2026-01-31';`
- Comparar com `GET /api/painel-compras-dashboard?data_inicio=2026-01-01&data_fim=2026-01-31` (totais atuais lidos do ERP).
- Tolerância: divergência > 0,5% bloqueia avanço.

### 3.2 ATU_RECEBIMENTOS — janela pequena (após correção da fonte)

```text
POST /api/etl/reprocessar
{ "tarefa": "ATU_RECEBIMENTOS", "data_ini": "2026-01-01", "data_fim": "2026-01-31" }
```

Conferências:

- `SELECT COUNT(*), SUM(valor_liquido) FROM bi_recebimentos WHERE data_recebimento BETWEEN '2026-01-01' AND '2026-01-31' AND tipo_movimento = 'RECEBIMENTO';`
- Comparar com `GET /api/notas-recebimento-dashboard?data_inicio=...`.
- Validar separadamente `DEVOLUCAO`, `ESTORNO`, `CANCELAMENTO` (contagem deve bater com flags do ERP).

### 3.3 Tela de apoio no Lovable

Criar uma sub-aba **"Validação"** dentro de `/etl` com cards somente leitura:

- Totais de `bi_compras` e `bi_recebimentos` por mês (últimos 6 meses).
- Última execução de cada tarefa (`etl_execucoes` mais recente por `tarefa_codigo`).
- Botão "Comparar com ERP" → chama `/api/painel-compras-dashboard` e `/api/notas-recebimento-dashboard` no modo **antigo** (sempre ERP) e mostra lado a lado com o BI.
- Status visual: verde se diff < 0,5%, amarelo até 2%, vermelho acima.

---

## 4. Feature flag `USE_BI_ANALYTICS` (sem mudar contrato dos endpoints)

Backend FastAPI:

```python
USE_BI = os.getenv("USE_BI_ANALYTICS", "false").lower() == "true"

def fonte_compras(filtros):
    if USE_BI:
        if supabase.count("bi_compras") == 0:
            raise HTTPException(409, "Base analítica ainda não populada. "
                                     "Execute a tarefa ETL correspondente.")
        return query_bi_compras(filtros)
    return query_erp_compras(filtros)  # comportamento atual, intacto
```

Aplicar a mesma estrutura nas 4 rotas:

- `GET /api/painel-compras`
- `GET /api/painel-compras-dashboard`
- `GET /api/notas-recebimento`
- `GET /api/notas-recebimento-dashboard`

Regras:

- `USE_BI_ANALYTICS=false` (default) → tudo continua como hoje, lendo do ERP. Nenhum risco para usuários.
- `USE_BI_ANALYTICS=true` → lê das tabelas `bi_*`.
- Se a tabela `bi_*` correspondente estiver vazia, **não cair silenciosamente para o ERP**: devolver erro 409 com a mensagem `"Base analítica ainda não populada. Execute a tarefa ETL correspondente."` para o frontend exibir banner amarelo. Isso evita máscara de bugs.
- **Não remover** as funções `query_erp_compras` / `query_erp_recebimentos`. Elas seguem como caminho default por pelo menos 1 semana após o cutover.

Frontend (Lovable):

- Sem mudança de contrato: `useDashboardData` continua chamando os mesmos endpoints.
- Adicionar tratamento do 409 com mensagem amigável (banner usando `EmptyState` do `@/components/bi`).

---

## 5. Plano de cutover seguro

```text
Fase A (agora)  → USE_BI_ANALYTICS=false. ETL roda. /etl/Validação compara totais.
Fase B          → após 2 janelas validadas com diff < 0,5%, ligar USE_BI_ANALYTICS=true em homologação.
Fase C          → 48h em produção com monitoramento de etl_execucoes (sem ERROR) e logs do FastAPI.
Fase D          → manter fallback ERP por 7 dias. Depois remover query_erp_* e o flag.
```

Em qualquer fase, basta setar `USE_BI_ANALYTICS=false` para reverter sem deploy de código.

---

## 6. Mudanças concretas neste loop (modo build)

Quando o plano for aprovado, o Lovable vai:

1. **Atualizar `docs/backend-etl-bi.md`**:
   - Corrigir fonte de `ATU_RECEBIMENTOS` para `E440NFC/E440IPC/E440ISC` (mesma base de `consultar_notas_recebimento`); remover qualquer referência a `E140*`.
   - Adicionar seção "Feature flag `USE_BI_ANALYTICS`" com o contrato de erro 409.
   - Adicionar seção "Sequência de validação V1" com as queries e tolerâncias.
2. **Atualizar `.lovable/plan.md`** refletindo o faseamento Fase A → D.
3. **Adicionar aba "Validação" em `src/pages/EtlAdminPage.tsx`** com:
   - Tabela de totais mensais (lendo `bi_compras` e `bi_recebimentos` via Supabase com RLS de admin).
   - Botão "Comparar com ERP" que chama os endpoints atuais e renderiza diff (componente reutilizando `DataTableBI` e `KpiCard`).
   - Indicadores verde/amarelo/vermelho.
4. **Frontend resiliente ao 409**: helper em `src/lib/api.ts` para detectar `409` com mensagem `"Base analítica ainda não populada"` e exibir `EmptyState` no lugar do dashboard.

Não vamos:
- Apontar dashboards para `bi_*` neste loop.
- Remover queries do ERP.
- Mexer em RLS das tabelas `bi_*` (já estão corretas: read-only para `authenticated`, escrita só service role).

---

## 7. O que precisa do time do FastAPI (fora do Lovable)

- Implementar/ajustar `tasks/atu_recebimentos.py` para consumir as mesmas tabelas que `consultar_notas_recebimento` usa hoje.
- Configurar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- Disparar os dois reprocessamentos de janela 2026-01-01 → 2026-01-31.
- Após Lovable validar diffs, ligar `USE_BI_ANALYTICS=true` em homolog.


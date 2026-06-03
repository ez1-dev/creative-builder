## Contexto

O backend FastAPI (externo) precisa ganhar:

1. Três novos templates SQL estáticos (`SQL_VM_FATURAMENTO_MANUAL`, `SQL_VM_FAT_CONTABIL`, `SQL_VM_FAT_TRB`).
2. Orquestração da tarefa `ATU_COMERCIAL` rodando as 4 ações em ordem, com **uma única limpeza** de `public.bi_faturamento` no período e **append** em todas as ações seguintes.
3. Normalização de colunas antes do upsert no Cloud (lowercase + alias `VL_ISMSST → vl_icmsst`).

Eu não tenho acesso ao código do FastAPI — entrego como **especificação** no `docs/backend-etl-central.md` para o time backend implementar. Os 3 SQLs serão salvos como arquivos de referência em `docs/etl-sql/` para o time copiar verbatim no Python.

Cadastro no Cloud (`etl_tarefas` + `etl_acoes`) já está OK — 4 ações nas ordens 1, 2, 4, 5 como `FUNCAO`. Não mexer.

## Arquivos a criar/editar (frontend repo)

### 1. `docs/etl-sql/SQL_VM_FATURAMENTO_MANUAL.sql` (novo)
Conteúdo idêntico ao `VM_FATURAMENTO_MANUAL.txt` anexado. 423 linhas. Placeholders `$[ANOMES_INI]` / `$[ANOMES_FIM]` preservados.

### 2. `docs/etl-sql/SQL_VM_FAT_CONTABIL.sql` (novo)
Conteúdo idêntico ao `VM_FAT_CONTABIL.txt`. 357 linhas. Placeholders preservados.

### 3. `docs/etl-sql/SQL_VM_FAT_TRB.sql` (novo)
Conteúdo idêntico ao `VM_FAT_TRB.txt`. 120 linhas. Placeholders preservados.

### 4. `docs/etl-sql/README.md` (novo)
Curto: explica que esses `.sql` são a **fonte canônica** dos templates estáticos e devem ser carregados literalmente nas constantes Python (`SQL_VM_*`) do FastAPI. Proibido editar nesses arquivos sem replicar no backend.

### 5. `docs/backend-etl-central.md` (editar)
Adicionar três seções novas no final:

**A. Registry `ETL_SQL_TEMPLATES`** — exemplo do dicionário esperado:
```python
ETL_SQL_TEMPLATES = {
    "VM_FATURAMENTO":          SQL_VM_FATURAMENTO,
    "SQL_VM_FATURAMENTO":      SQL_VM_FATURAMENTO,
    "VM_FATURAMENTO_MANUAL":   SQL_VM_FATURAMENTO_MANUAL,
    "SQL_VM_FATURAMENTO_MANUAL": SQL_VM_FATURAMENTO_MANUAL,
    "VM_FAT_CONTABIL":         SQL_VM_FAT_CONTABIL,
    "SQL_VM_FAT_CONTABIL":     SQL_VM_FAT_CONTABIL,
    "VM_FAT_TRB":              SQL_VM_FAT_TRB,
    "SQL_VM_FAT_TRB":          SQL_VM_FAT_TRB,
}
```
Fonte de cada constante: arquivos `.sql` em `docs/etl-sql/`. Manter placeholders `$[ANOMES_INI]` / `$[ANOMES_FIM]` — não converter para `DECLARE` / `@var`.

**B. Orquestração `ATU_COMERCIAL` (`POST /api/etl/tarefas/ATU_COMERCIAL/executar`)** — pseudocódigo:

```text
body: { "parametros": { "ANOMES_INI": "202606", "ANOMES_FIM": "202606" }, "acionado_por": "RENATO" }

1. Cria etl_execucoes (status=EM_EXECUCAO)
2. ÚNICA limpeza:
   DELETE FROM public.bi_faturamento
   WHERE anomes_emissao BETWEEN :ANOMES_INI AND :ANOMES_FIM
3. Carrega etl_acoes WHERE nome_tarefa='ATU_COMERCIAL' AND ativa ORDER BY ordem
   → [VM_FATURAMENTO, VM_FATURAMENTO_MANUAL, VM_FAT_CONTABIL, VM_FAT_TRB]
4. Para cada ação (ordem asc):
   a. Cria etl_acao_execucoes (EM_EXECUCAO)
   b. Resolve SQL: ETL_SQL_TEMPLATES[id_acao] (override estratégia
      de carga para APPEND nesta tarefa — IGNORAR REPLACE_PERIODO
      individual; já limpamos uma única vez no passo 2)
   c. Resolve placeholders ($[ANOMES_INI], $[ANOMES_FIM])
   d. Executa no ERP, normaliza linhas (ver bloco C)
   e. INSERT (append) em public.bi_faturamento com carga_id=execucao_id
   f. Atualiza etl_acao_execucoes (SUCESSO, total_linhas)
   g. caso_erro: PARAR aborta; CONTINUAR segue
5. Fecha etl_execucoes (status, total_linhas = soma, finalizado_em)
6. Atualiza etl_tarefas.status_atual

Resposta:
{
  "execucao_id": "...",
  "status": "SUCESSO",
  "totais": {
    "VM_FATURAMENTO": 12345,
    "VM_FATURAMENTO_MANUAL": 87,
    "VM_FAT_CONTABIL": 4321,
    "VM_FAT_TRB": 56,
    "total": 16809
  }
}
```

Importante: a estratégia `APPEND` é **forçada pela orquestração da tarefa ATU_COMERCIAL**, mesmo se `etl_acoes.estrategia_carga = REPLACE_PERIODO` em alguma ação. Senão, a 2ª ação apagaria a 1ª.

Quando uma ação é disparada **isoladamente** (`POST /api/etl/acoes/{id_acao}/executar`), aí sim respeita a `estrategia_carga` individual da ação (no caso, REPLACE_PERIODO no período informado).

**C. Normalização de colunas antes do INSERT em `bi_faturamento`** — função `_normalize_row(row, columns)`:

- Converte todas as chaves para **lowercase** (`CD_TP_MOVIMENTO → cd_tp_movimento`).
- Aplica mapeamento de aliases conhecidos:
  ```python
  COLUMN_ALIASES = {
      "vl_ismsst": "vl_icmsst",  # erro de digitação histórico
      # extensível
  }
  ```
- Descarta colunas que **não existem** em `bi_faturamento` (log WARN com lista no primeiro batch).
- Garante que todas as colunas NOT NULL tenham default (`mes_emissao`, `ano_emissao` etc. — já vêm do SELECT).

⚠️ Esta normalização **NÃO se aplica ao endpoint `/testar-sql`** (preview), que continua preservando o casing original — regra já documentada na seção "preview efêmero".

## Critério de aceite (manual)

```
POST /api/etl/tarefas/ATU_COMERCIAL/executar
{ "parametros": { "ANOMES_INI": "202606", "ANOMES_FIM": "202606" } }
```

1. `public.bi_faturamento` zerado para `anomes_emissao='202606'` antes da carga.
2. Após execução: linhas com `cd_tp_movimento` ∈ {`FATURAMENTO`, `FATURAMENTO MAN`, `DEVOLUÇÃO`} presentes.
3. `etl_execucoes` com `status=SUCESSO` e `total_linhas` = soma das 4 ações.
4. 4 linhas em `etl_acao_execucoes` (uma por ação, status SUCESSO, total_linhas individual).
5. `bi_faturamento.vl_icmsst` populado tanto para linhas que vieram com `VL_ICMSST` quanto com `VL_ISMSST`.

## Fora de escopo

- Código FastAPI (eu não tenho acesso ao repo dele).
- Mudanças em `etl_tarefas` / `etl_acoes` no Cloud (já estão corretas).
- Mudanças no frontend (`/etl`, `EditarSqlModal`, `ExecutarModal`).
- Migrations no Cloud.

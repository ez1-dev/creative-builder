## Migração do módulo Programação para Lovable Cloud

Hoje o módulo `/producao/programacao` chama 5 endpoints do FastAPI que respondem "Supabase não configurado". Vamos abandonar o FastAPI para este módulo e mover tudo para o Lovable Cloud (tabelas + edge function de cálculo), mantendo o mesmo contrato de tipos do frontend.

### Visão geral

```text
┌────────────┐   leitura    ┌────────────────────┐
│ Frontend   │ ───────────▶ │ bi_ops_fila        │ (popular via ETL depois)
│ Programação│              │ programacao_capac. │
│ (5 abas)   │              │ programacao_agenda │
│            │   gerar      └────────────────────┘
│            │ ──────▶ Edge Function "programacao-gerar"
└────────────┘            (algoritmo simples FIFO + capacidade)
```

### 1. Novas tabelas no Cloud

**`bi_ops_fila`** (read-only no frontend; será populada pelo ETL futuramente)
- `id` uuid PK
- `codemp` int, `unidade_negocio` text, `tipo_recurso` text
- `codcre` text, `descre` text
- `codori` text, `numorp` text, `situacao` text (`A` / `L`)
- `codpro` text, `descricao_produto` text
- `codopr` text, `descricao_operacao` text
- `quantidade_prevista` numeric, `tempo_previsto_min` numeric
- `prioridade` int (default 5)
- `data_geracao_op` date
- `etl_updated_at` timestamptz
- RLS: leitura para `authenticated`; sem INSERT/UPDATE/DELETE (ETL usará service role).

**`programacao_capacidades`** (CRUD pelo frontend)
- `id` uuid PK
- `codemp` int, `codcre` text, `descre` text
- `minutos_dia` int, `qtde_recursos` int, `eficiencia_perc` numeric
- `hora_inicio` text (HH:MM)
- `considerar_sabado` bool, `considerar_domingo` bool
- `ativo` bool, `obs` text
- Unique (`codemp`, `codcre`)
- RLS: leitura para `authenticated`; INSERT/UPDATE/DELETE só para admins (`is_admin(auth.uid())`).

**`programacao_agenda`** (gravada pela edge function; lida pelo frontend)
- `id` uuid PK
- `lote_programacao` text (uuid gerado a cada execução)
- `data_programada` date, `hora_inicio` text, `hora_fim` text
- `codemp` int, `unidade_negocio` text, `tipo_recurso` text
- `codcre` text, `descre` text
- `codori` text, `numorp` text, `codpro` text, `codopr` text, `descricao_operacao` text
- `tempo_alocado_min` int, `segmento` int (parte da OP quando há quebra)
- `status_programacao` text default `'PROGRAMADO'`
- `created_at` timestamptz
- RLS: leitura para `authenticated`; escrita só via edge function (service role).

### 2. Edge Function `programacao-gerar`

Recebe `GerarProgramacaoPayload`, executa algoritmo simples e grava em `programacao_agenda`.

Algoritmo:
1. Valida JWT (verify_jwt em código).
2. Lê fila de `bi_ops_fila` filtrada por situação/unidade/recurso.
3. Lê capacidades ativas de `programacao_capacidades`.
4. Ordena fila por `prioridade ASC`, `data_geracao_op ASC`.
5. Para cada OP, encontra próximo slot disponível no `codcre` correspondente respeitando:
   - `minutos_dia × qtde_recursos × eficiencia_perc/100` por dia
   - pular sábado/domingo conforme flags
   - `permitir_quebra_operacao` → divide entre dias (gera múltiplas linhas com `segmento`)
6. Se `limpar_anterior` = true, deleta agenda anterior do mesmo escopo antes.
7. Insere todas as linhas em `programacao_agenda` com o mesmo `lote_programacao`.
8. Retorna `GerarProgramacaoResponse`.

### 3. Frontend — substituir `programacaoApi.ts`

Reescrever cada método para usar `supabase` ao invés de `api.get/post`. Mantém **exatamente** as mesmas assinaturas e tipos de retorno, então os componentes (`FilaOpsTab`, `AgendaRecursoTab`, `MapaGargalosTab`, `CapacidadesTab`, `GerarProgramacaoTab`) e o hook `useProgramacao.ts` **não precisam de alteração**.

- `fila(f)` → `select` em `bi_ops_fila` com filtros.
- `gerar(p)` → `supabase.functions.invoke('programacao-gerar', { body: p })`.
- `agenda(f)` → `select` em `programacao_agenda` com filtros.
- `gargalos(f)` → query que agrupa `programacao_agenda` por (data, codcre) e cruza com `programacao_capacidades` para calcular ocupação; implementada como função SQL `get_programacao_gargalos(...)` security definer para evitar lógica pesada no cliente.
- `capacidades(codemp)` → `select` em `programacao_capacidades`.
- `salvarCapacidades(rows)` → `upsert` em `programacao_capacidades` (chave `codemp,codcre`).

### 4. Limpeza

- Remover apenas o uso do `api.get/post` deste módulo. O `src/lib/api.ts` continua existindo para os outros módulos que ainda usam FastAPI.
- Atualizar `mem://index.md` notando que Programação migrou 100% para Cloud.

### Fora de escopo

- Popular `bi_ops_fila` (depende de ETL — fica como tarefa do backend FastAPI futuramente; por ora a tabela ficará vazia e a tela mostrará "Sem dados").
- Algoritmo avançado de sequenciamento (setup/troca de ferramenta).
- Edição manual da agenda gerada.
- Realtime / notificações.

### Detalhes técnicos

- A função `get_programacao_gargalos(p_data_ini date, p_data_fim date, p_codemp int, p_codcre text)` retorna `TABLE(data, dia_semana, unidade_negocio, codcre, descre, carga_programada_horas, capacidade_disponivel_horas, ocupacao_perc, status)`.
  - `status` classificado por ocupação: `<0.7 OK`, `0.7–1.0 ATENCAO`, `>1.0 GARGALO`, sem capacidade cadastrada `SEM_PARAMETRO`.
- Index em `programacao_agenda(data_programada, codcre)` e `bi_ops_fila(codcre, situacao)` para performance.
- Edge function usa `SUPABASE_SERVICE_ROLE_KEY` para escrever agenda; valida JWT do usuário via `getClaims()` antes.

### Passos de implementação

1. Migration: criar 3 tabelas + RLS + função `get_programacao_gargalos`.
2. Criar edge function `programacao-gerar`.
3. Reescrever `src/lib/producao/programacaoApi.ts` para usar Cloud.
4. Smoke test: capacidades CRUD, gerar com fila vazia (deve retornar 0 linhas sem erro), consultar agenda/gargalos.
5. Atualizar memória do projeto.

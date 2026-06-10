## Diagnóstico

O frontend já distingue corretamente tarefa × ação:

- `/etl` → "Executar" em uma linha da tabela `etl_tarefas` chama `executarTarefa(nome)` → `POST /api/etl/tarefas/{nome}/executar`.
- `/etl/tarefas/:nome` → botão "Executar tarefa" idem; botão "Executar" dentro da grade de ações é o único que chama `POST /api/etl/acoes/{id_acao}/executar`.

O único lugar que chama "ATU_COMERCIAL" é o botão **"Atualizar Comercial"** em `src/pages/FaturamentoGeniusPage.tsx` (linhas 491-524), que dispara `POST /api/faturamento-genius/atualizar` (endpoint custom da FastAPI, não /api/etl/*). É esse endpoint do backend que internamente está chamando `executar_acao("ATU_COMERCIAL")` em vez de `executar_tarefa("ATU_COMERCIAL")` — daí o erro `Ação ETL não encontrada: ATU_COMERCIAL`.

Como o Lovable não toca no FastAPI, a correção é especificada em documento de patch para o time backend, e o frontend ganha apenas robustez para tratar mensagens novas.

## Mudanças

### 1. Novo doc `docs/backend-faturamento-genius-atualizar-PATCH.md`
Especifica como `/api/faturamento-genius/atualizar` deve funcionar:

- Buscar `etl_tarefas` por `codigo_tarefa = 'ATU_COMERCIAL'` (ou `nome_tarefa`, mantendo retrocompatibilidade) → obter `tarefa_id`.
- Listar `etl_acoes WHERE tarefa_id = :id AND ativa = true ORDER BY ordem`.
- Criar 1 linha em `etl_execucoes` (status `EM_EXECUCAO`).
- Para cada ação, criar linha em `etl_acao_execucoes` e executar respeitando `caso_erro` (ABORTAR vs CONTINUAR).
- Aceitar payload com `anomes_ini`/`anomes_fim` (case-insensitive). Substituir placeholders `$[ANOMES_INI]` / `$[ANOMES_FIM]`.
- Retornar `{ execucao_id, status, mensagem }`.
- **Nunca** chamar `executar_acao("ATU_COMERCIAL")` — `ATU_COMERCIAL` é tarefa, não ação. Se chamado erroneamente como ação, retornar 400 com mensagem clara ("ATU_COMERCIAL é uma tarefa; use /api/etl/tarefas/ATU_COMERCIAL/executar").
- Critérios de aceite (replicar os do usuário): linha em `etl_execucoes`, linhas em `etl_acao_execucoes` para `VM_FATURAMENTO`, `VM_FATURAMENTO_MANUAL`, `VM_FAT_CONTABIL`, `VM_FAT_TRB` na ordem cadastrada.

Inclui exemplo de payload, SQL de validação no Supabase Cloud (consultar `etl_tarefas`/`etl_acoes`/`etl_execucoes`) e snippet Python sugerido.

### 2. Pequeno hardening no frontend (`src/pages/FaturamentoGeniusPage.tsx`)
Em `atualizarComercial`, quando a resposta vier com erro contendo "Ação ETL não encontrada: ATU_COMERCIAL", trocar a mensagem genérica por um aviso explicando que o backend FastAPI ainda não aplicou o patch (apontando o doc), em vez de só toast `err?.message`. Não muda o fluxo de chamada — continua `POST /api/faturamento-genius/atualizar`, que é o contrato correto.

### Fora do escopo
- Não alterar `src/lib/etl/api.ts`, `ExecutarModal`, nem `EtlAdminPage` / `EtlTarefaDetalhePage`: já usam corretamente `executarTarefa` vs `executarAcao`.
- Não criar rota nova nem mexer em tabelas do Cloud.

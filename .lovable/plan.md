# Investigação do ETL — bi_faturamento vazia

## Estado atual (levantado da camada analítica)

- `bi_faturamento`: **0 linhas** → causa direta da mensagem "Nenhum dado encontrado" no gráfico IA.
- `etl_tarefas`: existe **1 tarefa** ativa (`ATU_COMERCIAL`, grupo `GERAL`) com:
  - `status_atual = PENDENTE`
  - `ultima_execucao_em = null`  → **nunca rodou**.
- `etl_execucoes`: **0 linhas** → nenhuma execução foi registrada (nem sucesso nem erro).
- Ações configuradas para `ATU_COMERCIAL` (todas ativas, todas via API FastAPI):
  1. `VM_FATURAMENTO` → `POST /api/etl/comercial/faturamento` → `bi_faturamento`
  2. `VM_FATURAMENTO_MANUAL` → `/api/etl/comercial/faturamento-manual` → `bi_faturamento`
  3. `VM_FAT_CONTABIL` → `/api/etl/comercial/faturamento-contabil` → `bi_faturamento`
  4. `VM_FAT_TRB` → `/api/etl/comercial/faturamento-tributos` → `bi_faturamento`
  5. `ATU_COMERCIAL` → finalização (sem endpoint).
- Configurações em `etl_configuracoes_bi` estão ok (`FALLBACK_TO_ERP_WHEN_BI_EMPTY=true`, cache habilitado etc.).

## Diagnóstico

O ETL nunca foi disparado. Como a execução real acontece **no FastAPI**, a Cloud só registra o resultado depois que o backend chama de volta para gravar em `etl_execucoes` / `bi_faturamento`. Sem nenhum registro em `etl_execucoes`, temos dois cenários prováveis:

1. **O job nunca foi acionado** (nem manualmente pela tela `/etl`, nem por agendamento no FastAPI).
2. **O FastAPI tentou rodar mas falhou antes de gravar a execução** (ex.: erro de auth/CRON_SECRET, endpoint fora do ar, ou ETL ainda não implementado para `ATU_COMERCIAL`).

Como o ETL é responsabilidade do backend externo, o plano abaixo é **investigativo**, sem mudança de código no frontend ou edge functions.

## Plano de investigação (passos sugeridos)

1. **Disparar manualmente pela tela `/etl`**
   - Abrir `/etl`, localizar a tarefa `ATU_COMERCIAL` e acionar "Executar".
   - Observar se aparece nova linha em `etl_execucoes` e o status final (`SUCESSO` / `ERRO`).

2. **Se aparecer ERRO**
   - Ler `etl_execucoes.erro` + `etl_logs` da execução.
   - Erros mais prováveis e como tratar:
     - `401 / 403` chamando FastAPI → revisar `CRON_SECRET` no backend e no header `x-cron-secret` que o FastAPI espera (mesmo padrão já corrigido na `bi-ia-chart`).
     - `404` no endpoint → endpoint ETL não implementado/roteado no FastAPI (`/api/etl/comercial/faturamento*`).
     - Timeout / `ngrok` offline → subir o túnel `https://api-erp-renato.ngrok.app`.

3. **Se não aparecer NENHUMA execução após o disparo**
   - O acionamento manual em `/etl` não está chegando ao FastAPI. Validar:
     - Edge function que dispara o ETL (acionador) está deployada e respondendo.
     - URL do FastAPI configurada nos secrets da Cloud.
     - CORS / `ngrok-skip-browser-warning` ok.

4. **Validação final**
   - `SELECT count(*) FROM bi_faturamento;` deve passar de 0.
   - Reabrir o BI Comercial e refazer o prompt do gráfico IA — deve renderizar normalmente (a edge function `bi-ia-chart` já está correta e independente do FastAPI para a leitura).

## Critério de aceite

- `etl_tarefas.ATU_COMERCIAL.ultima_execucao_em` deixa de ser `null`.
- `etl_execucoes` mostra ao menos uma linha `SUCESSO` para `ATU_COMERCIAL`.
- `bi_faturamento` com `count > 0` para o período consultado.
- Gráfico IA do BI Comercial renderiza sem "Nenhum dado encontrado".

## Observações

- Nenhuma alteração de código está prevista neste plano — a causa raiz é operacional/backend.
- Caso a investigação mostre que o endpoint ETL no FastAPI ainda **não existe** ou precisa de ajuste, abriremos um plano separado (no FastAPI, fora deste repositório) seguindo `docs/backend-etl-bi.md`.

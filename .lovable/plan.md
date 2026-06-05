## Objetivo
Permitir sincronizar as metas de faturamento do BI Comercial a partir da UpQuery, chamando a FastAPI já existente (`POST /api/bi/comercial/metas/sincronizar`) sem expor o `CRON_SECRET` no frontend, e refletir o resultado na tela de metas, no BI Comercial e no ETL.

## 1. Backend (Lovable Cloud)

### 1.1 Migração — coluna `origem_meta`
Adicionar em `public.bi_meta_faturamento`:

- `origem_meta text not null default 'MANUAL'` (valores esperados: `MANUAL`, `UPQUERY_VM_FATURAMENTO`)
- `origem_atualizada_em timestamptz`
- índice `(anomes_emissao, unidade_negocio, origem_meta)`

Regra de precedência (consulta do BI): quando existir linha `UPQUERY_VM_FATURAMENTO` para o par `(anomes, unidade)`, ela prevalece sobre `MANUAL`. Implementado no frontend em `fetchMetaCloudTotal` (sem mudar policies/grants existentes).

### 1.2 Edge Function `sync-metas-upquery` (proxy seguro)
- `verify_jwt = true` (default — apenas usuários autenticados).
- Lê `FASTAPI_BASE_URL` e `CRON_SECRET` do ambiente (já existem como secrets).
- Faz `POST ${FASTAPI_BASE_URL}/api/bi/comercial/metas/sincronizar` com headers:
  - `x-cron-secret: <CRON_SECRET>`
  - `ngrok-skip-browser-warning: true`
  - `Content-Type: application/json`
- Body recebido do frontend e repassado: `{ anomes_ini, anomes_fim, origem }` (validação Zod).
- Retorna ao frontend: `{ ok, status, data | error, periodo }` mantendo `linhas_detalhe`, `linhas_resumo`, `totais_por_mes`, `totais_por_unidade`.
- CORS padrão Lovable.

## 2. Frontend

### 2.1 `src/lib/bi/metasFaturamentoApi.ts`
- Adicionar campos `origem_meta` e `origem_atualizada_em` ao tipo `MetaFaturamento`.
- Nova função `sincronizarMetasUpquery({ anomes_ini, anomes_fim })` que chama `supabase.functions.invoke('sync-metas-upquery', { body: { ..., origem: 'UPQUERY_VM_FATURAMENTO' } })`.
- Ajustar `fetchMetaCloudTotal` para aplicar precedência UPQUERY > MANUAL por `(anomes, unidade)` antes de extrapolar (mantendo a regra atual de meses).

### 2.2 `src/pages/bi/MetasFaturamentoPage.tsx`
- Header: novo botão **"Sincronizar metas da UpQuery"** abrindo um diálogo simples com:
  - Anomês inicial (YYYY-MM, default = jan do ano filtrado)
  - Anomês final (YYYY-MM, default = dez do ano filtrado)
  - Ação dispara mutation; durante a chamada: toast/loader "Sincronizando metas da UpQuery..."
- Após sucesso: invalida `['bi-metas']` e `['bi-comercial','meta-cloud']`, exibe Card de resumo com:
  - `linhas_detalhe`, `linhas_resumo`
  - tabela `totais_por_mes`
  - tabela `totais_por_unidade`
- Em caso de erro, alerta amigável com `status HTTP`, mensagem da API e período enviado.
- Tabela de metas: nova coluna **Origem** com badge:
  - `UPQUERY_VM_FATURAMENTO` → Badge "UpQuery" (variant secondary)
  - `MANUAL` (ou null) → Badge "Manual" (variant outline)
- Novo Card **"Metas importadas por mês e unidade"** (somente registros com `origem_meta = 'UPQUERY_VM_FATURAMENTO'`) com colunas: AnoMês, Unidade, Código, Descrição, Valor Meta, Origem, Atualizado em.

### 2.3 BI Comercial
- Como `fetchMetaCloudTotal` é a única fonte do card Meta, ajustar lá já cobre:
  - Meta exibida usa UPQUERY quando existir; fallback MANUAL.
  - Diferença = Faturamento − Meta; % Atingimento = Faturamento / Meta × 100 (já existem).
  - CONSOLIDADO continua somando GENIUS + ESTRUTURAL ZORTEA apenas.
- Invalidar `['bi-comercial','meta-cloud']` após sincronizar para refrescar os cards.

### 2.4 ETL `EtlTarefaDetalhePage`
- Quando a tarefa for `ATU_COMERCIAL`:
  - Após uma execução com status `SUCESSO`/`CONCLUIDA`, exibir ação "Sincronizar metas da UpQuery para o mesmo período" (usa `anomes_ini`/`anomes_fim` da execução; chama a mesma Edge Function).
  - Adicionar um `Switch` local (persistido em `localStorage` por usuário, chave `etl.atu_comercial.auto_sync_metas`) **"Sincronizar metas automaticamente após ATU_COMERCIAL"**. Quando ligado, após sucesso do `executarTarefa('ATU_COMERCIAL', ...)`, dispara automaticamente a Edge Function com o mesmo período.
- Sem alterações em outras tarefas.

## 3. Critérios de aceite mapeados
- [x] Botão na tela `/bi/comercial/metas`.
- [x] Chamada vai por Edge Function → FastAPI; `CRON_SECRET` nunca chega ao bundle do frontend.
- [x] Após sincronizar, listagem é recarregada (invalidate de `['bi-metas']`).
- [x] Cards do BI Comercial refletem nova meta (invalidate de `['bi-comercial','meta-cloud']` + precedência UPQUERY > MANUAL em `fetchMetaCloudTotal`).
- [x] Badges Manual / UpQuery na lista; tabela de conferência das metas importadas.
- [x] Erro mostra status, mensagem e período sem quebrar a tela.
- [x] Integração no ETL com ação manual + opção de auto-sync.

## Out of scope
- Não tocar em `src/integrations/supabase/{client,types}.ts` nem `.env`.
- Não alterar SQL/ETL no FastAPI (rota já existe).
- Não mudar policies/grants existentes de `bi_meta_faturamento` (a coluna nova herda as policies atuais).
- Sem mudanças no consolidado para incluir "OUTROS".

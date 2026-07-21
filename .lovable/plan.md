## Problema

O botão "Atualizar Resultado" e o runner "Executar tudo automaticamente" chamam `POST /api/contabil/modelos/{id}/atualizar-cache`, que é **síncrono** e leva de 13 a 48s. O `contabilApi` tem timeout fixo de **15s**, então a chamada quase sempre estoura com:

> "Processo automático interrompido: API contábil não respondeu em 15s (.../atualizar-cache)"

O backend já expõe fluxo assíncrono (`POST .../materializar-resultado` → `job_id` → polling em `GET /api/contabil/jobs/{job_id}`), inclusive já usado em `dispararMaterializacao()` com o `MaterializacaoDialog` (modal "Processando DRE/Balanço..."). A correção é parar de usar `atualizar-cache` para operações pesadas e passar tudo pelo job assíncrono.

## Correção

### 1. `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`

**Runner `executarTudoAutomatico`** (linhas ~772-817):
- Remover o passo intermediário que chama `atualizarCacheSenior.mutateAsync(...)` para Balanço.
- Passar direto de "Vincular contas" (quando faltar) para "Gerar resultado" via `materializar.mutateAsync(filtrosComDatas)` — o backend já faz sync do ERP + recálculo dentro do job (o payload de `useMaterializarResultado` já envia `sincronizar_erp: true`, `recalcular: true`, `fonte_saldo`, `modo_balanco`, `data_corte`, `aplicar_referencia_senior`).
- Ajustar labels ("Passo 1/2 · Vinculando..." / "Passo 2/2 · Gerando resultado..." ou "Gerando resultado..." quando só faltar cache).
- Reduzir o tipo de `autoStep` para `"vincular" | "gerar"` e atualizar os pontos onde é lido (badge/stepper) para refletir apenas essas duas etapas.

**Handler `handleAtualizarCacheSenior`** (linhas ~742-759) e o botão do stepper que o dispara (linha ~1484):
- Substituir a implementação por `dispararMaterializacao()` (mantendo o mesmo rótulo visível "Atualizar cache Senior" apenas se o usuário quiser distinção, ou renomear para "Atualizar Resultado" — ver pergunta abaixo). O importante é que a ação passe a abrir a modal de progresso do job.

**Stepper "Como gerar o resultado — passo a passo"**:
- Colapsar as fases "Atualizar cache Senior" e "Gerar resultado" em uma única fase "Atualizar Resultado" (assíncrona) porque agora o job faz as duas coisas juntas. Manter "Vincular contas" como fase 1 quando aplicável.

### 2. `src/hooks/contabil/api.ts`

- Marcar `useAtualizarCacheSenior` como legado com comentário explicando que não deve ser usado em fluxos que envolvam ano inteiro. Não remover (pode ainda ser útil para períodos curtos), mas deixar claro.
- Opcional: no hook, elevar o timeout específico dessa chamada para 60s via um segundo argumento em `api.post` (se suportado) — só como salvaguarda. Se `contabilApi` não suportar override, deixar como está e apenas documentar.

### 3. Nada a mexer em `MaterializacaoDialog.tsx` / `useJobStatus`

O polling e o fechamento automático quando `status === CONCLUIDO` já estão corretos e invalidam `resultado-pronto`.

## Resultado esperado

- "Atualizar Resultado" e "Executar tudo automaticamente" nunca mais dão timeout de 15s.
- A modal "Processando DRE/Balanço... X de Y" passa a refletir o job real da operação completa (sync ERP + recálculo).
- Operações de 30-48s concluem normalmente.

## Pergunta

Confirma que posso **eliminar** o passo "Atualizar cache Senior" da UI (stepper + botão) e deixar só "Atualizar Resultado" (assíncrono, que já faz sync+recálculo)? Ou prefere manter o botão separado só para períodos curtos de 1-2 meses?
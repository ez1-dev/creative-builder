## Objetivo

Fechar as pendências restantes da tela `Contabilidade — DRE` (`src/pages/bi/contabilidade/DrePage.tsx`) para que a fonte apareça literalmente como o backend retorna, sincronização e recálculo virem uma ação encadeada, novos estados (banco offline, fonte incorreta, conciliação pendente) sejam explícitos e não sobrem cache silencioso. O grosso da refatoração da rodada anterior fica; este plano é incremental.

Verificado: `rg` não encontra nenhuma referência a `:8090` no `src/`. Nada a remover neste tópico — mantemos o alerta preventivo (item 6) caso algum dia reapareça.

## Escopo

### 1. Payload correto de sincronização
- `src/lib/contabil/dreMatrizApi.ts`: alterar `postDreSincronizarErp` para enviar `{ anomes_ini, anomes_fim, fonte_saldo, limpar_periodo }` (não mais `ano/mes_ini/mes_fim`). Aceitar `fonte_saldo` opcional; default = `meta.fonte_saldo` corrente ou `E640RAT` quando indefinido.
- Adicionar `postDreMaterializar({ anomes_ini, anomes_fim, modelo_id? })` distinto de `postDreRecalcular` (mantém o segundo como alias por retrocompat).

### 2. Fluxo encadeado após sincronizar
- `DreAcoesAdmin`: após confirmação de **Sincronizar saldos**, executar automaticamente:
  1. `POST /api/contabil/dre/sincronizar` (toast: "Sincronizando saldos…").
  2. Ao concluir, `POST /api/contabil/dre/recalcular` (toast: "Recalculando DRE…").
  3. Ao concluir, `queryClient.invalidateQueries({ queryKey: ['dre-*'] })` + `onAtualizarTela()` para refetch da matriz e do health.
  4. Toast final de sucesso/erro por etapa; se qualquer passo falhar, interromper e mostrar erro específico.
- Manter também **Recalcular DRE** como ação isolada (para quando o usuário só quer materializar).

### 3. Fonte ativa exibida literalmente
- `DreMetaBar.tsx`: quando `meta.fonte_saldo` for `null`/vazio, mostrar badge de aviso `Fonte contábil não informada` (ícone amarelo). Nunca assumir E640RAT no frontend.
- No topo da faixa, exibir chip destacado `Fonte dos saldos: <valor>` quando presente.

### 4. Novos estados/alertas
- Novo state `banco_offline`: quando `describeDreError(err).kind === 'erp_offline'` → banner "A API está online, mas o banco ERP está indisponível.". Aproveitar helper já existente em `src/lib/bi/dreErrors.ts`.
- Novo state `fonte_incorreta`: quando `meta.fonte_saldo` presente e diferente da fonte de validação esperada (constante `FONTE_VALIDACAO_DRE = 'E640RAT'` em `src/lib/contabil/dreMatrizApi.ts`) → banner "A fonte ativa não corresponde à fonte definida para validação da DRE.".
- Novo indicador `Status da conciliação: pendente | conciliada | divergente` derivado de `meta.status_conciliacao` (adicionar campo tolerante ao normalizador; default `pendente` quando ausente).
- Reforçar `DreIncompletoBanner`: incluir motivo automático "Competência com linhas recorrentes zeradas" quando qualquer mês do payload tiver Receita Bruta > 0 mas Custos/Despesas/Depreciação = 0 (usar apenas para acender o aviso — nenhum valor é recalculado; apenas inspeção de células retornadas).

### 5. Zero cache silencioso
- Ao trocar filtros ou disparar `atualizarTela`, limpar `linhasRaw`/`meta` **apenas** após exibir o estado "Recarregando…" atual, mas em caso de erro persistente por mais de um refetch, esvaziar a matriz e mostrar somente o banner de estado (não continuar apresentando os últimos números como se fossem atuais). Implementar via contador de tentativas.
- `queryClient.removeQueries({ queryKey: ['dre-conciliacao-bi'] })` e um `AbortController` reciclado — já existe; passar a limpar `meta` no `catch` quando `kind` for `api_offline`/`erp_offline`.

### 6. Guarda preventiva contra porta 8090
- Adicionar em `getContabilBaseUrl()` (`src/lib/contabil/contabilApi.ts`): se a URL final contiver `:8090` ou `localhost:8090`, logar `console.warn` uma vez e cair para o default. Assim qualquer regressão futura fica visível.

### 7. Documentação de env
- Adicionar `docs/backend-dre-api-integrada.md` de uma página listando: base URL oficial (`https://dreconfiguravel.ngrok.app` → porta local 8070), variável `VITE_DRE_API_URL`, endpoints usados pela tela (`/api/contabil/health`, `/api/contabil/dre/matriz`, `/api/contabil/dre/sincronizar`, `/api/contabil/dre/recalcular`, `/api/contabil/dre/conciliacao-bi`) e payloads exatos. Não editar `.env` (é auto-gerado pelo Cloud).

## Arquivos

Editar:
- `src/lib/contabil/dreMatrizApi.ts` (payload sync, materializar, constante fonte validação, campo `status_conciliacao` no meta).
- `src/lib/contabil/contabilApi.ts` (guarda `:8090`).
- `src/components/contabil/DreMetaBar.tsx` (fonte literal + fallback + status conciliação).
- `src/components/contabil/DreAcoesAdminDialog.tsx` (fluxo encadeado sync→recalc→refetch).
- `src/components/contabil/DreIncompletoBanner.tsx` (mensagens novas).
- `src/pages/bi/contabilidade/DrePage.tsx` (states banco/fonte incorreta, detecção linhas recorrentes zeradas, passagem da `fonte_saldo` para as ações admin, limpeza de cache em erro persistente).

Criar:
- `docs/backend-dre-api-integrada.md`.

## Fora de escopo

- Backend, JWT, CORS, migrações no Cloud.
- Estruturas de outras telas contábeis (DRE Dinâmica, Studio, Configuração).
- Parsing de XLS no navegador — permanece proibido; conciliação continua vindo do backend.
- Alteração do arquivo `.env` (auto-gerado). Configuração de override fica documentada.

## Critérios de aceite

- Payload de sincronização = `{ anomes_ini, anomes_fim, fonte_saldo, limpar_periodo }`.
- Clique único em "Sincronizar saldos" dispara sync → recalc → refetch com feedback etapa a etapa.
- Sem `fonte_saldo` no meta, badge "Fonte contábil não informada" aparece; com valor, é exibido exatamente como veio.
- Banner específico para banco ERP offline e para fonte diferente de `E640RAT`.
- Indicador visível de "Status da conciliação".
- Alerta automático quando junho (ou qualquer mês) tem Receita Bruta > 0 e linhas recorrentes zeradas.
- Guarda em `getContabilBaseUrl()` neutraliza qualquer URL residual com `:8090`.
- Em erro persistente da API, a matriz é esvaziada e só o banner de estado permanece — nunca mostra números antigos como atuais.
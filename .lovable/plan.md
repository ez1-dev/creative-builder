## Objetivo

Fechar a integração do módulo Requisição de Materiais com a FastAPI :8070, expondo o status do SID, bloqueando escritas quando o backend estiver com `SID_HABILITADO=false` e adicionando uma tela restrita de teste controlado. Nada de SOAP no navegador, nada de recriar módulo.

## O que já existe (não recriar)

- `src/services/requisicoesApi.ts` com `IntegracaoDesabilitadaError` (503), `X-Idempotency-Key` em todo POST, e stubs `sidRequisitar` + `reprocessarIntegracao`.
- `src/types/requisicoes.ts` com `StatusRequisicao` (`ERRO_INTEGRACAO` presente; falta `PENDENTE_INTEGRACAO`, `PROCESSANDO`, `NAO_ENVIADA`, `INTEGRADA`).
- 9 páginas em `src/pages/requisicoes/` + `IntegracaoOfflineBanner`, `AcaoItemDialog`, `JustificativaDialog`, `StatusBadge`.
- `src/hooks/requisicoes/index.ts` com mutations idempotentes por ação.

## Mudanças

### 1. Tipos e serviço (`src/types/requisicoes.ts`, `src/services/requisicoesApi.ts`)

- Adicionar `SidServicoStatus` e `SidStatusResponse` conforme spec (campos: `sid_habilitado`, `ger_sid`, `cha_separacao`, `proximo_passo`; cada serviço tem `url`, `operacao`, `wsdl_ok`, `erro?`).
- Complementar `StatusRequisicao` com `NAO_ENVIADA`, `PENDENTE_INTEGRACAO`, `PROCESSANDO`, `INTEGRADA` (mantendo os atuais).
- Em `requisicoesApi`: adicionar `pingSid(): Promise<SidStatusResponse>` chamando `GET /api/requisicoes/sid/ping`, e os 6 métodos restantes (`sidRateio`, `sidAtender`, `sidMovimentar`, `sidBaixarComponentes`, `sidReservarComponente`, `sidExcluir`) mapeando para os endpoints listados.
- Manter regra: 503 → `IntegracaoDesabilitadaError` → mapear no chamador para `PENDENTE_INTEGRACAO`; falha SOAP real (4xx/5xx com detalhe) → `ERRO_INTEGRACAO`. Não misturar os dois.

### 2. Hook de status (`src/hooks/requisicoes/index.ts`)

- `useSidStatus()`: React Query key `['requisicoes','sid','ping']`, `staleTime` 60s, `refetchInterval` 2min, `refetchOnWindowFocus` true. Expor `{ status, isLoading, isError, refetch, lastCheckedAt }`.
- `useSidWriteEnabled()`: derivado — `sid_habilitado && ger_sid.wsdl_ok`. Usado por todos os botões de escrita.

### 3. Banner global (`src/components/requisicoes/IntegracaoOfflineBanner.tsx`)

- Refatorar para consumir `useSidStatus()` e exibir automaticamente quando `sid_habilitado === false` ou WSDL indisponível, com texto padrão da spec.
- Incluir nas páginas: `NovaRequisicaoOpPage`, `NovaRequisicaoAvulsaPage`, `AlmoxarifadoFilaPage`, `RequisicaoDetalhePage` (aba Integração), e no topo de `AprovacoesPage`.
- Consultas (OP, saldos, histórico, KPIs) permanecem funcionando.

### 4. Gating dos botões de escrita

- Criar util `disableIfSidOff(status)` retornando `{ disabled, tooltip }`. Aplicar em:
  - `NovaRequisicaoOpPage` / `NovaRequisicaoAvulsaPage`: "Enviar" desabilitado; permite "Salvar rascunho".
  - `AprovacoesPage`: aprovar/rejeitar continuam (não são SID) — não bloquear.
  - `AlmoxarifadoFilaPage` e `AcaoItemDialog`: reservar/separar/atender/transferir/baixar/registrar falta desabilitados com tooltip explicativo.
  - `RequisicaoDetalhePage`: "Enviar", "Reprocessar integração", "Estornar" desabilitados.
- Todos os handlers já usam `X-Idempotency-Key`; garantir que o botão bloqueia clique duplo via `isPending`.

### 5. Seção "Integração Senior SID" em `/requisicoes/configuracoes`

- Nova seção acima das configurações atuais em `ConfiguracoesRequisicoesPage.tsx`:
  - Cabeçalho com badge geral (Verde WSDL OK / Amarelo escrita off / Vermelho serviço fora / Azul verificando).
  - Duas linhas: `co_ger_sid` e `cha_separacao` — mostrar operação, `wsdl_ok`, mensagem tratada em `erro` (sem stack/XML).
  - "Última verificação" (horário local) e botão **Testar conexão** → `refetch()`.
  - "Próximo passo" quando `proximo_passo` vier preenchido.
- Nunca renderizar credenciais, URL com senha, XML, headers ou stack.

### 6. Nova tela `/requisicoes/configuracoes/teste-sid`

- Rota nova em `src/App.tsx`, protegida por `ProtectedRoute` + gate `useIsAdmin()` (redireciona não-admin).
- Registrar em `src/lib/screenCatalog.ts` e como filho em `src/config/menuCatalog.ts` (subitem em Configurações Requisições, visível só a admin).
- Formulário: empresa, filial, produto, derivação, quantidade, transação, depósito, observação — nada hardcoded.
- Alerta laranja + input obrigatório digitando `CONFIRMAR TESTE SID` para habilitar "Executar".
- Fluxo:
  1. Botão "Ping" → chama `pingSid()` e mostra o resultado tratado.
  2. Botão "Executar requisição" (habilitado só com `sid_habilitado` + confirmação digitada) → `sidRequisitar(...)`. Exibe `NUMEME` / `SEQEME` do retorno.
  3. Botão "Excluir requisição de teste" → `sidExcluir({ numeme, seqeme })`.
- Exibir retorno bruto tratado (JSON já sanitizado pelo backend), sem SOAP.

### 7. Histórico e status

- Ao chamar qualquer SID: registrar localmente (cache do detalhe) `{ acao, timestamp, usuario, idempotency_key, numeme?, seqeme?, movimento?, status }` para renderizar em `RequisicaoDetalhePage` → aba Integração.
- Em `catch`: se `IntegracaoDesabilitadaError` → marcar item como `PENDENTE_INTEGRACAO` no cache local e mostrar toast neutro; se `RequisicaoApiError` → `ERRO_INTEGRACAO` com mensagem tratada. Nenhum retry automático.
- Idempotência: chave gerada uma vez por tentativa e mantida no cache da mutation; em timeout, botão "Reprocessar" reenvia com a MESMA chave.

### 8. `ReservaSeparacaoComponente`

- Marcar o botão correspondente na fila como "Experimental" e desabilitado por padrão, com tooltip: "Operação E900RCP/F900RCP não utilizada neste ambiente".

## Fora de escopo

- Alterar backend, WSDL, envelopes SOAP.
- Expor / controlar `SID_HABILITADO` pelo frontend.
- Redesign visual do módulo.
- Chamar Middleware Senior direto do navegador.

## Critérios de aceite (validação final)

- `/requisicoes/configuracoes` mostra status dos dois serviços com badge colorido e botão "Testar conexão".
- Banner global aparece nas telas listadas quando `sid_habilitado=false`.
- Botões de escrita desabilitados com tooltip quando SID off; consultas seguem OK.
- 503 → `PENDENTE_INTEGRACAO`; erro real → `ERRO_INTEGRACAO`.
- Retentativa reaproveita `X-Idempotency-Key`.
- Nenhuma credencial/XML aparece na UI.
- `/requisicoes/configuracoes/teste-sid` só para admin, exige confirmação digitada, aceita parâmetros do formulário, exibe NUMEME/SEQEME e permite excluir.
- Sem controle de `SID_HABILITADO` no frontend.

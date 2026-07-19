## Requisição de Materiais — Fases 2, 3 e 4

Base da Fase 1 (services, tipos, hooks, rotas, menu, listagem) já entregue. Estas fases completam o módulo consumindo os 7 endpoints SID gated + read-only da OP no FastAPI :8070. Nenhuma escrita SOAP no navegador, nenhum recálculo local, nenhum fallback silencioso pra mock quando a API falhar. Todas as mutations passam pelo `requisicoesApi` com `X-Idempotency-Key`, e todo 503 vira `IntegracaoOfflineBanner` + status `ERRO_INTEGRACAO`, sem stack trace pro usuário.

### Fase 2 — Fluxo OP completo (`/requisicoes/nova` + `/requisicoes/nova-op`)

Objetivo: sair do placeholder atual e permitir criar/enviar requisição vinculada a OP real, respeitando `SITORP`/`pode_requisitar` e as quantidades vindas da API (nunca recalcular).

- `src/pages/requisicoes/NovaRequisicaoPage.tsx`: dois cards (Com OP / Avulsa) — só navegação, sem lógica.
- `src/pages/requisicoes/NovaComOpPage.tsx` (refinamento do stub):
  - Formulário de busca `codori` + `numorp` → `requisicoesApi.consultarOp` (já existe).
  - `OpHeaderCard` (novo) com produto final, projeto, `SITORP`, qtd prevista/produzida, badge de bloqueio quando `pode_requisitar=false` mostrando `motivo_bloqueio`.
  - `OpComponentesGrid` (novo): tabela editável dos `componentes[]`. Colunas: `CODCMP`, descrição, unidade, qtd prevista, utilizada, requisitada, transferida, **disponível (readonly, direto da API)**, qtd a requisitar (input). Bloqueia linha se `pode_requisitar=false` ou disponível ≤ 0.
  - Validação: `qtd_a_requisitar ≤ quantidade_disponivel` (usando o número da API, sem somar nada). Excesso exige `justificativa_excesso` (tolerância vem de `ConfigRequisicoes.tolerancia_op_pct`).
  - `TipoAtendimentoOpSelector` (novo): rádio Transferir vs Baixar Direto, aplicado por item ou em massa.
  - Campos gerais: centro de custo, projeto, fase, prioridade, data necessária, observações. Todos vindos de selects reutilizando `ComboboxFilter`/hooks de cadastros já existentes.
  - Ações: **Salvar Rascunho** (`criar`), **Enviar** (`criar` + `enviar` na mesma cadeia com a mesma idempotency key). Toast + navegação para `/requisicoes/:id`. 503 mostra `IntegracaoOfflineBanner` e mantém rascunho.
- Componentes novos em `src/components/requisicoes/`: `OpHeaderCard.tsx`, `OpComponentesGrid.tsx`, `TipoAtendimentoOpSelector.tsx`, `JustificativaDialog.tsx`.
- Hooks novos em `src/hooks/requisicoes/`: `useConsultarOp`, `useCriarEEnviar` (mutation composta que reusa a idempotency key entre `criar` e `enviar`).

### Fase 3 — Aprovações + Fila do Almoxarifado + Separação Agrupada

Objetivo: cobrir o meio do fluxo (aprovar/rejeitar/devolver → separar → atender parcial → transferir/baixar → registrar falta → enviar pra compras), com **lock de separação** e **preservação de saldo pendente**.

- `src/pages/requisicoes/AprovacoesPage.tsx`:
  - Lista filtrada `situacao=AGUARDANDO_APROVACAO` (reusa `useRequisicoes` com filtro fixo).
  - `AprovacaoActionsBar` (novo): Aprovar / Aprovar com ajuste / Rejeitar / Devolver p/ ajuste — todos exigem `JustificativaDialog` quando negativos.
  - Detalhe inline expandindo linha (itens com qtd solicitada vs aprovada editável). Chama `requisicoesApi.aprovar/rejeitar` por requisição, uma idempotency key por ação.
- `src/pages/requisicoes/AlmoxarifadoPage.tsx`:
  - `FilaAlmoxTable` (novo) consumindo `filaAlmox`. Colunas conforme `FilaAlmoxItem`: número, item, `CODCMP`, OP, CC, qtd solicitada/aprovada/separada/atendida/**pendente**, saldos (readonly da API), depósito origem/destino, prazo, prioridade, `LockOwnerBadge` (mostra `separacao_por` + `separacao_desde`).
  - Ações por linha (habilitadas conforme situação do item):
    - **Assumir** → `iniciarSeparacao` (cria lock; se outro usuário já detém, mostra toast "em separação por X" e desabilita).
    - **Reservar** → `SepararDialog` novo (informa qtd + lote/endereço) → `reservar` + `separar`.
    - **Atender (total/parcial)** → `AtenderDialog` novo. Parcial mantém `qtd_pendente` na fila (não recalcular; usar valor retornado pela API).
    - **Transferir** → `TransferirDialog` (depósito destino sugerido pela API, editável).
    - **Baixar OP** → `BaixarOpDialog` (usa `POST .../baixar-op` que roteia pro SID `BaixarComponentes`).
    - **Registrar falta** → `RegistrarFaltaDialog` (qtd faltante + observação).
    - **Enviar p/ compras** → `enviarCompras`.
    - **Estornar item** → confirmação simples.
  - Filtros: OP, produto, CC, depósito, prioridade, apenas com falta, apenas com meu lock.
- `src/pages/requisicoes/AgrupadasPage.tsx`:
  - `SeparacaoAgrupadaView` (novo): consome `requisicoesApi.agrupadas`, agrupa visualmente por produto+derivação+depósito, mostra as OPs/estágios/seqs que compõem cada linha (rateio preservado pela API — só exibir).
  - Ação em massa `agrupadasSeparar` com payload = seleção do usuário. `X-Idempotency-Key` único por lote.
- Componentes novos: `AprovacaoActionsBar`, `FilaAlmoxTable`, `LockOwnerBadge`, `SepararDialog`, `AtenderDialog`, `TransferirDialog`, `BaixarOpDialog`, `RegistrarFaltaDialog`, `SeparacaoAgrupadaView`.
- Hooks novos: `useFilaAlmox`, `useAgrupadas`, mutations `useIniciarSeparacao/useReservar/useSeparar/useAtender/useTransferir/useBaixarOp/useRegistrarFalta/useEnviarCompras/useEstornarItem/useAgrupadasSeparar` — cada uma invalida `requisicoes`, `requisicao(id)`, `filaAlmox`, `agrupadas`, `kpis` no `onSuccess`.

### Fase 4 — Detalhe + Histórico + Configurações + Avulsa completa

Objetivo: fechar o módulo com visão 360º da requisição, criação sem OP e parâmetros administráveis.

- `src/pages/requisicoes/DetalhePage.tsx` (`/requisicoes/:id`):
  - Header com número, tipo, `StatusBadge`, prioridade, solicitante, aprovador, datas, % atendido, botões contextuais (Enviar, Cancelar, Estornar, Reprocessar integração).
  - Abas: **Itens** (tabela readonly com todos os campos + qtd pendente), **Histórico** (`HistoricoTimeline` novo consumindo `historico`), **Integração** (mostra `mensagem_integracao`/`movimento_senior` do último evento com erro + botão `reprocessarIntegracao` quando `situacao=ERRO_INTEGRACAO`).
  - `IntegracaoOfflineBanner` no topo se qualquer ação recebeu 503 recentemente.
- `src/pages/requisicoes/NovaAvulsaPage.tsx` (refinamento):
  - Cabeçalho: tipo (CONSUMO/TRANSFERENCIA/DEVOLUCAO/EMERGENCIAL), empresa/filial, setor, prioridade, data necessária, CC/projeto/fase, justificativa.
  - `ItensAvulsosEditor` (novo): adicionar itens buscando produto por autocomplete (reusa `useCadastrosErp`), depósito origem/destino, lote, série, observação, qtd. Sem consulta de OP.
  - Ações: Salvar Rascunho / Enviar (mesma composição idempotente da Fase 2).
- `src/pages/requisicoes/ConfiguracoesPage.tsx`:
  - Formulário editando `ConfigRequisicoes`: tipos habilitados (multi-check), depósitos permitidos (multi-select), exige aprovação (switch), limite aprovação automática, tolerância OP %, SLA horas, famílias bloqueadas, observações.
  - Restrito a `admin` via `useRequisicoesRole()`.
  - `useConfigRequisicoes` (query) + `useAtualizarConfiguracoes` (mutation com invalidação da própria query).
- Componentes novos: `HistoricoTimeline`, `ItensAvulsosEditor`, mais os dialogs de cancelar/estornar reutilizando `JustificativaDialog`.

### Papéis e visibilidade (aplicado nas 3 fases)

- Novo hook `src/hooks/requisicoes/useRequisicoesRole.ts` derivando papéis (`solicitante`, `aprovador`, `almoxarifado`, `pcp`, `compras`, `admin`) a partir de `useUserPermissions` + `screenCatalog`. Só controla habilitar/desabilitar botão e exibir aba — **autoridade final é o backend**.
- Menu (`src/config/menuCatalog.ts`) e `screenCatalog.ts` já têm as 9 rotas registradas na Fase 1; nada a mexer além de garantir que Aprovações/Almoxarifado/Agrupadas/Configurações fiquem visíveis apenas para os papéis correspondentes (via `screenCatalog` permission keys).

### Contratos com o backend

Todas as chamadas usam endpoints já expostos em `requisicoesApi`:

```text
GET  /api/requisicoes                       lista + kpis (?só_kpis via /kpis)
GET  /api/requisicoes/:id                   detalhe
GET  /api/requisicoes/:id/historico         timeline
GET  /api/requisicoes/op/:codori/:numorp    consulta OP (já ok)
POST /api/requisicoes                       criar (idempotente)
PUT  /api/requisicoes/:id                   atualizar rascunho
POST /api/requisicoes/:id/enviar            envia p/ aprovação/almox
POST /api/requisicoes/:id/aprovar|rejeitar|cancelar|estornar
GET  /api/requisicoes/almoxarifado/fila
POST /api/requisicoes/:id/itens/:seq/{iniciar-separacao|reservar|separar|atender|transferir|baixar-op|registrar-falta|enviar-compras|estornar}
GET  /api/requisicoes/agrupadas             + POST /agrupadas/separar
GET/PUT /api/requisicoes/configuracoes
POST /api/requisicoes/integracoes/:id/reprocessar
```

Cada POST que dispara ação SID pode retornar 503 (`SID_HABILITADO=N`); a UI cai no fluxo "integração desabilitada" — banner + status persistido — sem duplicar a criação nem chamar SID direto.

### Regras rígidas revalidadas

- Nunca somar/recalcular `quantidade_disponivel`, `qtd_pendente`, saldos — sempre exibir o número da API.
- Componente da OP é `CODCMP` (nunca `CODPRO`).
- Depósito/transação sugeridos pela API; UI mostra e aceita o que voltar.
- Sem fallback silencioso pra mock quando API der erro (`ApiOfflineError` vira toast + estado de erro, não mock).
- Sem exibir XML/stack trace pro usuário — só mensagens amigáveis.
- Nenhuma escrita direta em `E207EME`, `E210MVP`, `E900CMO` a partir do frontend.

### Arquivos que serão criados/alterados

- **Novos componentes** (`src/components/requisicoes/`): `OpHeaderCard`, `OpComponentesGrid`, `TipoAtendimentoOpSelector`, `JustificativaDialog`, `AprovacaoActionsBar`, `FilaAlmoxTable`, `LockOwnerBadge`, `SepararDialog`, `AtenderDialog`, `TransferirDialog`, `BaixarOpDialog`, `RegistrarFaltaDialog`, `SeparacaoAgrupadaView`, `HistoricoTimeline`, `ItensAvulsosEditor`.
- **Páginas refinadas** (`src/pages/requisicoes/`): `NovaRequisicaoPage`, `NovaComOpPage`, `AprovacoesPage`, `AlmoxarifadoPage`, `AgrupadasPage`, `DetalhePage`, `NovaAvulsaPage`, `ConfiguracoesPage`.
- **Novos hooks** (`src/hooks/requisicoes/`): `useConsultarOp`, `useCriarEEnviar`, `useFilaAlmox`, `useAgrupadas`, `useRequisicoesRole`, `useConfigRequisicoes`, e uma mutation por ação SID (com invalidação consistente).
- **Sem alterar**: `requisicoesApi.ts`, `types/requisicoes.ts`, `menuCatalog.ts`, `screenCatalog.ts`, `App.tsx` (todos já preparados na Fase 1).

### Estratégia de entrega

Entrego as 3 fases numa passada só, em commits lógicos por fase, para você validar em ordem: Fase 2 primeiro (fluxo OP end-to-end), depois Fase 3 (aprovações + almox + agrupadas), depois Fase 4 (detalhe + avulsa + config). Se preferir uma fase por turno pra testar cada uma antes de seguir, me avisa que eu quebro.

Confirma que posso implementar as 3 fases numa passada só?

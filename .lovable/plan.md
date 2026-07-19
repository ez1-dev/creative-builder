## Módulo Requisição de Materiais — Plano de Implementação

Módulo grande e transversal. Vou entregar em **4 fases** para permitir validação incremental (sem quebrar rotas nem menu antes da hora). Nenhuma escrita SOAP no navegador, tudo passando por `VITE_API_BASE_URL` (FastAPI 8070). Nada de banco paralelo no Cloud.

### Arquitetura

```text
Frontend (Lovable, React+Vite)
  └── src/services/requisicoesApi.ts   (única entrada HTTP do módulo)
        └── FastAPI :8070               (leituras diretas + escritas SID/WS Senior)
```

- `requisicoesApi.ts` centraliza fetch, base URL (`VITE_API_BASE_URL`), header `ngrok-skip-browser-warning`, `X-Idempotency-Key` em todo POST de processamento, retry/timeout, mapeamento 503 → estado "integração desabilitada".
- Tipos TS em `src/types/requisicoes.ts` (Requisicao, Item, StatusRequisicao, ComponenteOP, FilaAlmoxItem, HistoricoEvento, Configuracoes).
- Hooks React Query em `src/hooks/requisicoes/*` (`useRequisicoes`, `useRequisicao`, `useOpComponentes`, `useFilaAlmox`, `useHistorico`, `useConfigRequisicoes`, mutations por ação).
- Mocks isolados em `src/mocks/requisicoes.ts`, ativados **só** quando `VITE_USE_REQUISICOES_MOCK === 'true'`. Sem fallback automático para mock quando API falhar.
- Guards de perfil por hook `useRequisicoesRole()` derivado de `useUserPermissions` + `user_roles` (papéis: solicitante, aprovador, almoxarifado, pcp, compras, admin). Backend é a autoridade final.

### Reuso do que já existe

- Layout, sidebar, header, autenticação, tema: **sem alterações estruturais**.
- Componentes: `PageHeader`, `FilterPanel`, `ComboboxFilter` (`src/components/erp/*`), `KpiOrMissing`, tabelas shadcn, `Skeleton`, badges de status já usados em outros módulos.
- Menu: adicionar no catálogo `src/config/menuCatalog.ts` dentro de **ERP → Estoque** o subitem **"Requisição de Materiais"** com 6 rotas. Nada de menu novo de topo. Rotas registradas em `src/App.tsx` protegidas por `ProtectedRoute` e adicionadas ao `src/lib/screenCatalog.ts` para permissões.

### Rotas

```text
/requisicoes                       Lista + KPIs + filtros
/requisicoes/nova                  Escolha OP / avulsa (2 cards)
/requisicoes/nova-op               Requisição com OP
/requisicoes/nova-avulsa           Requisição sem OP
/requisicoes/aprovacoes            Fila de aprovação
/requisicoes/almoxarifado          Fila única do almoxarifado
/requisicoes/agrupadas             Separação agrupada
/requisicoes/:id                   Detalhe + aba Histórico
/requisicoes/configuracoes         Parâmetros
```

### Componentes reutilizáveis (novos)

- `StatusBadge` (mapa de cor conforme spec).
- `RequisicaoFiltros`, `RequisicaoTabela`, `RequisicaoKpis`.
- `OpHeaderCard`, `OpComponentesGrid` (respeita `pode_requisitar`, usa `CODCMP`, calcula nada — só exibe o disponível vindo da API).
- `TipoAtendimentoOpSelector` (Transferir / Baixar direto).
- `ItensAvulsosEditor`.
- `AprovacaoActionsBar`, `JustificativaDialog`.
- `FilaAlmoxTable`, `SepararDialog`, `AtenderDialog`, `TransferirDialog`, `BaixarOpDialog`, `RegistrarFaltaDialog`, `LockOwnerBadge` (mostra quem assumiu a separação).
- `SeparacaoAgrupadaView` (agrupa por produto/derivação/depósito, mantém rateio por OP/estágio/seq).
- `HistoricoTimeline`.
- `IntegracaoOfflineBanner` (para 503 SID).

### Endpoints consumidos (todos via `requisicoesApi.ts`)

Lista completa conforme spec seção 15. Adaptador único trata 503 → status `ERRO_INTEGRACAO`/pendente com mensagem amigável, sem duplicar a criação local.

### Idempotência

`requisicoesApi.post()` gera `X-Idempotency-Key` (uuid) por ação. Mutations React Query guardam a chave no cache local durante o ciclo da ação; retry usa a mesma chave. Chave estável por `(reqId, itemSeq, acao, tentativaId)`.

### Fases

1. **Base + navegação vazia** — services, tipos, hooks, mocks, rotas registradas, menu, guards, `IntegracaoOfflineBanner`, listagem `/requisicoes` funcional lendo `GET /api/requisicoes` (mock enquanto backend não tem).
2. **Fluxo OP** — `/nova`, `/nova-op` com `GET /api/requisicoes/op/{codori}/{numorp}` (endpoint real), grade de componentes usando `CODCMP` e `quantidade_disponivel` da API, bloqueio por `SITORP`/`pode_requisitar`, seletor Transferir/Baixar, envio via `POST /api/requisicoes` + `POST .../enviar` (tolera 503).
3. **Aprovações + Almoxarifado + Agrupadas** — `/aprovacoes`, `/almoxarifado`, `/agrupadas`, lock de separação, atendimento parcial preservando saldo pendente, rateio por OP mantido.
4. **Detalhe + Histórico + Configurações + Avulsa completa** — `/:id` com timeline, `/nova-avulsa`, `/configuracoes`, reprocessar integração.

### Regras rígidas que o código deve respeitar

- Nunca chamar SOAP/SID do navegador.
- Nunca gravar em `E207EME`, `E210MVP`, `E900CMO` a partir do frontend nem do Cloud.
- Nunca recalcular `quantidade_disponivel`; usar sempre o valor da API.
- Componente da OP é `CODCMP` (não `CODPRO`).
- Depósito/transação final vêm da API/regra `900SDPBC01`; a UI mostra sugestão mas aceita o retorno.
- Sem fallback silencioso para mock quando API estiver offline.
- Sem stack trace, XML ou erro bruto para o usuário.

### Fora de escopo

- Implementar/alterar backend FastAPI ou tabelas Senior.
- Criar tabelas `requisicoes_*` no Cloud (fonte oficial é o Senior; Cloud não entra nesse módulo).
- Login separado ou fluxo de auth novo.
- Redesign visual do restante do ERP.

### Arquivos que serão criados/alterados (visão geral)

- **Novos**: `src/services/requisicoesApi.ts`, `src/types/requisicoes.ts`, `src/hooks/requisicoes/*`, `src/mocks/requisicoes.ts`, `src/pages/requisicoes/*` (9 páginas), `src/components/requisicoes/*` (componentes listados acima).
- **Alterados (mínimo)**: `src/App.tsx` (rotas), `src/config/menuCatalog.ts` (subitens em Estoque), `src/lib/screenCatalog.ts` (permissões), `.env` (documentar `VITE_API_BASE_URL` e `VITE_USE_REQUISICOES_MOCK`; sem sobrescrever variáveis Cloud auto-geradas).

Confirma que posso começar pela **Fase 1** (base + listagem) e seguir nas próximas mensagens com as demais fases? Ou prefere que eu já entregue as 4 fases numa única passada, aceitando um PR bem maior?

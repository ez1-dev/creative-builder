## Objetivo

Incorporar o **DRE Studio** (do ZIP anexado) como módulo nativo do portal, reutilizando layout, sidebar, autenticação, permissões, cliente HTTP e tema — sem app paralela, sem novo login, sem porta 8090, consumindo apenas `/api/contabil/*` via `VITE_API_BASE_URL`.

## Análise já feita

- **ZIP**: 5 rotas (`dre.index`, `dre.novo`, `dre.modelo.$id.{editar,estrutura,orcamento,visualizacao,conciliacao}`) + ~25 componentes contábeis (`EstruturaTree`, `LinhaDialog`, `PlanoContasPanel`, `DrillDrawer`, `ComposicaoDREDialog`, `MonthPicker`, `MoneyCell`, `CriarDREPadraoDialog`, `CriarBalancoPadraoSeniorDialog`, `ApiOfflineBanner` etc.), tipagem completa em `types/contabil.ts` e cliente `lib/contabilApi.ts` já apontando para `/api/contabil/*`.
- **Portal atual**: rotas React Router em `src/App.tsx` protegidas por `<ProtectedRoute path=…>`; menu em `src/components/AppSidebar.tsx`; cliente HTTP central `src/lib/api.ts` (já envia `Authorization` e `ngrok-skip-browser-warning`); permissões via `useUserPermissions` + tabela `screen_permissions`. Já existe `DreConfiguravelPainelPage` consumindo `/api/contabil/{modelos,realizado/resumo}`, mas sem editor, orçamento nem gerenciamento de modelos.

## Escopo (o que será construído)

### 1. Novas rotas (React Router, dentro de `AppLayout`)

```
/contabilidade/dre-studio                       → Visão Geral (KPIs + gráficos)
/contabilidade/dre-studio/modelos               → Listagem de modelos
/contabilidade/dre-studio/modelos/novo          → Criação (vazio / padrão DRE / padrão Balanço)
/contabilidade/dre-studio/modelos/:modeloId     → Editor (3 painéis: árvore | linha | contas)
/contabilidade/dre-studio/orcamento             → Grade mensal de orçamento
/contabilidade/dre-studio/resultado             → Tabela hierárquica realizado x orçado
```

Todas envoltas em `<ProtectedRoute path="/contabilidade/dre-studio">`. A rota antiga `/bi/financeiro/dre-configuravel` permanece intacta.

### 2. Menu lateral (`AppSidebar.tsx`)

Novo grupo sob o item **Contabilidade** já existente (ou criado se ausente):

```
Contabilidade
└── DRE Studio
    ├── Visão Geral
    ├── Modelos
    ├── Orçamento
    └── Resultado
```

Sem duplicar entradas antigas de DRE.

### 3. Estrutura de arquivos novos

```
src/pages/contabilidade/dre-studio/
  DreStudioVisaoGeralPage.tsx
  DreStudioModelosPage.tsx
  DreStudioModeloNovoPage.tsx
  DreStudioModeloEditorPage.tsx
  DreStudioOrcamentoPage.tsx
  DreStudioResultadoPage.tsx

src/components/dre-studio/
  DreFilters.tsx           (empresa/filial/modelo/período/centro custo)
  DreHealthBanner.tsx      (usa GET /api/contabil/health)
  DreKpiCards.tsx
  DreResultTable.tsx       (hierárquica, colapsável, coluna fixa)
  DreModelTree.tsx         (árvore + drag opcional — só usa PUT ordem)
  DreLineForm.tsx          (formulário completo da linha)
  DreAccountSelector.tsx   (busca no plano de contas com filtros)
  DreLinkedAccounts.tsx    (lista + desvincular)
  DreBudgetGrid.tsx        (12 meses + total, copiar/distribuir/limpar)
  DreDrillDialog.tsx       (desabilitado se endpoint ausente)

src/lib/contabil/
  dreStudioApi.ts          (todos os endpoints /api/contabil/*, via `api` central)
  dreStudioTypes.ts        (portados de types/contabil.ts do ZIP, enxutos)
  dreStudioErrors.ts       (reaproveita describeDreError existente)

src/hooks/contabil/
  useDreStudioModels.ts
  useDreStudioModel.ts
  useDreStudioLinhas.ts
  useDreStudioContas.ts
  useDreStudioPlanoContas.ts
  useDreStudioCentrosCusto.ts
  useDreStudioResultado.ts
  useDreStudioOrcamento.ts
  useDreStudioHealth.ts
```

Todos usam `@tanstack/react-query` (já no projeto) e `api.get/post/put/delete` de `src/lib/api.ts`. Não será criado 2º cliente HTTP.

### 4. Endpoints consumidos (somente os confirmados na especificação)

| Método | Rota |
|---|---|
| GET | `/api/contabil/health` |
| GET | `/api/contabil/estrutura-padrao?tipo_modelo=DRE\|BALANCO` |
| GET/POST/PUT/DELETE | `/api/contabil/modelos[/:id]` |
| POST/PUT/DELETE | `/api/contabil/modelos/:mid/linhas[/:lid]` |
| GET/POST/DELETE | `/api/contabil/modelos/:mid/linhas/:lid/contas[/:vid]` |
| GET | `/api/contabil/plano-contas` |
| GET | `/api/contabil/centros-custo` |
| GET/POST | `/api/contabil/orcamento` |
| GET | `/api/contabil/modelos/:mid/resultado-cache` |

Drill-down: detecção via `/openapi.json` (já usado por `useDreApiHealth`). Se não encontrar rota, botão desabilitado com tooltip *"Detalhamento disponível após ativação do endpoint no backend."*

### 5. Reaproveitamento visual do ZIP

Portados/adaptados ao design system (tokens semânticos do portal, `bg-card`, `text-foreground`, etc.):

- **EstruturaTree** → `DreModelTree` (mesma UX de expandir/recolher, ícones por tipo, add-filho, badges).
- **LinhaDialog** → `DreLineForm` como painel (não modal), mesmos campos.
- **PlanoContasPanel** → `DreAccountSelector` com busca + filtros.
- **MoneyCell**, **MonthPicker**, **ContasBadge**, **FonteSaldoBadge**, **ApiOfflineBanner** → componentes utilitários.
- **CriarDREPadraoDialog / CriarBalancoPadraoSeniorDialog** → passos de "novo modelo" (vazio / DRE padrão / Balanço padrão via `estrutura-padrao`).
- **ComposicaoDREDialog / DrillDrawer** → `DreDrillDialog`.
- **dre.modelo.$id.visualizacao.tsx** (2600 linhas) é a referência para `DreResultTable` (hierarquia, análise vertical, expandir/recolher, formatação).

**Não** portados: `router.tsx`, `__root.tsx`, `server.ts`, `start.ts`, `contabilStore`, `error-capture`, `contabilConfig` (variáveis próprias), rotas `.conciliacao` (dependem de CCCC106, fora do escopo pedido).

### 6. Permissões

Registrar as 4 permissões no catálogo do portal (`src/lib/screenCatalog.ts`) e usá-las via `useUserPermissions().canView/canEdit/canDelete` no path `/contabilidade/dre-studio`:

- `contabilidade.dre.visualizar` → acessar Visão Geral / Resultado
- `contabilidade.dre.configurar` → editar modelos/linhas/contas
- `contabilidade.dre.orcamento` → gravar orçamento
- `contabilidade.dre.excluir` → deletar modelo/linha

Botões e ações escondidos + ProtectedRoute + guard nos hooks de mutação.

### 7. Tratamento de erros

Reuso de `src/lib/bi/dreErrors.ts::describeDreError` (já cobre API offline, ERP SQL Server, 404, auth). Serão adicionados novos "kinds":

- `supabase_dre_offline` — detectado por payload contendo `supabase` / `service_role`
- `modelo_not_found` — 404 em `/modelos/:id`
- `estrutura_vazia` — resposta OK com lista vazia
- `sem_resultado` — resultado-cache vazio
- `endpoint_indisponivel` — 501 / 405

Prioridade: `error.response.data.detail` → `.message` → `error.message` → fallback. Detail objeto é serializado.

### 8. Exportação

CSV e XLSX gerados no frontend (usa `xlsx` se já presente, senão CSV puro). Cabeçalho com modelo, empresa, filial, período, timestamp e usuário. Sem endpoint novo.

### 9. Regras de não-regressão

- **Nada** de `/api/contabilidade/*` é tocado.
- Rotas `/bi/contabilidade/dre*`, `/bi/financeiro/dre-configuravel`, `/contabilidade/balanco` continuam intactas.
- `src/lib/api.ts`, `AuthContext`, `AppLayout`, `AppSidebar`, `ProtectedRoute` só recebem *adições* (rotas/itens de menu), nunca refactor.
- Nenhuma referência a `dreconfiguravel.ngrok.app`, `8090`, `VITE_DRE_API_URL` (já removidas em turnos anteriores — será feito `rg` de confirmação).
- Nenhum secret no frontend.

### 10. Validação

1. `tsgo` sobre arquivos novos (o harness já roda typecheck automático).
2. Playwright headless: navegar em `/contabilidade/dre-studio`, `/modelos`, criar modelo, abrir editor, ver Network → confirmar 100% `/api/contabil/*`, sem 401/CORS.
3. Verificar tema escuro e responsividade (viewport 1280 e 768).

## Detalhes técnicos-chave

- Datas: usuário vê "Jul/2026", persistido como `anomes = 202607` (helper `anomesFormat` já existe no ZIP; será portado como `src/lib/contabil/anomes.ts`).
- UUIDs: validador antes de qualquer POST/PUT; nada de `"undefined"`/`"null"` no payload.
- Cancelamento: react-query já cancela ao trocar `queryKey` (empresa/modelo/período são chaves).
- Modo demo: flag `VITE_DRE_DEMO_MODE=false` só ativa fixtures em dev; nunca em produção.
- Health banner mostra 3 status: API online / ERP inacessível / Supabase-DRE indisponível (do `/health`).
- Ordenação de linhas: PUT individual em `ordem` (sem endpoint de reorder em lote).
- Drag-and-drop na árvore: opcional na v1 — se sair rápido, ok; senão, botões ↑/↓.

## Fora de escopo (para não inflar a entrega)

- Conciliação CCCC106 e Materialização (ZIP tem, mas não foram pedidos).
- Aprovação/publicação de modelos (o backend `/api/contabil/*` não expõe endpoint disso).
- Upsert de orçamento sem confirmação de endpoint PATCH/PUT no `/openapi.json`.

## Entregável final

Relatório imprimindo: arquivos criados/alterados, rotas, itens de menu, permissões, endpoints consumidos, URL base, referências antigas removidas, endpoints indisponíveis, funcionalidades desabilitadas, resultado do build/testes, pendências.
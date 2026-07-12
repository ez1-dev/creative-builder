
## Objetivo

Trazer o pacote `DRE_Studio_5-2.zip` inteiro para dentro do portal como módulo nativo em Contabilidade, reaproveitando shell/menu/auth/tema/API client contábil já existentes. Nenhum projeto separado, nenhum router paralelo (TanStack Router do zip é descartado — usamos React Router do portal).

## Estrutura de rotas (todas em `src/pages/contabilidade/dre-studio/`)

```
/contabilidade/dre-studio                        → DreStudioIndex (lista de modelos + status API)
/contabilidade/dre-studio/novo                   → DreStudioNovo (form + criar padrão Senior)
/contabilidade/dre-studio/configuracoes          → DreStudioConfiguracoes
/contabilidade/dre-studio/:id                    → layout com tabs
    ├─ /estrutura                                → EstruturaTree + LinhaDialog + PlanoContasPanel
    ├─ /orcamento                                → grade mensal editável
    ├─ /visualizacao                             → resultado + drill + composição + cache
    ├─ /conciliacao                              → DRE×Balanço + CC CC 106 + validação Senior
    └─ /editar                                   → ModeloForm
```

As rotas atuais (`modelos`, `modelo/novo`, `modelo/:id`, `orcamento/:id`, `resultado/:id`, `visao-geral`) são substituídas por essas novas. Redireciono as URLs antigas para as novas.

## Componentes portados (adaptados ao design system do portal)

Todos vão para `src/components/dre-studio/`, substituindo os arquivos atuais quando houver equivalente:

- `ApiOfflineBanner` → funde com `DreHealthBanner` existente (mantém dados técnicos: URL testada, status, detalhes).
- `EstruturaTree`, `LinhaDialog`, `PlanoContasPanel`, `MoneyCell`, `MonthPicker`, `ContasBadge`, `FonteSaldoBadge`.
- `ComposicaoDREDialog`, `DrillDrawer`, `HistoricoCacheDialog`, `MaterializacaoDialog`, `ResultadoExercicioDialog`.
- `ConciliacaoDREBalancoPanel`, `ConciliacaoCCCC106Table`, `ConciliacaoSeniorMensalTable`, `ImportarCCCC106Dialog`, `ValidacaoCCCC106`.
- `CriarDREPadraoDialog`, `CriarBalancoPadraoSeniorDialog`, `PendenciasCtaredZeroPanel`.
- `ModeloForm`, `ConnectionStatus` (mini indicador no header do módulo).

Ajustes obrigatórios: remover imports de `sonner` direto (usar `useToast` do portal); trocar `Link`/`useNavigate` do TanStack por React Router; usar tokens semânticos do design system (nunca `bg-white`, `text-black`); usar `Sidebar` do portal (não recriar shell).

## Hooks e API

- Novos hooks em `src/hooks/contabil/`: `useCCCC106`, `useConciliacaoSeniorMensal`, `useCriarDREPadrao`, `useCriarBalancoPadraoSenior`, `useVincularContasDRESenior`, `useVincularContasBalancoSenior`, `useHistoricoCache`, `useSnapshots`, `usePendenciasCtaredZero`, `useReferenciaSenior`, `useAgendamentosContabeis`.
- `useDreStudio.ts` existente é ampliado (não substituído): novas queries reaproveitam `contabilApi` de `src/lib/contabil/contabilApi.ts` (já independente do ERP, timeout 15s, header ngrok, base `dreconfiguravel.ngrok.app`).
- `src/lib/contabil/dreStudioApi.ts` ganha wrappers para os novos endpoints (mantém tratamento `dreKind` para 404/timeout/rede/501).
- `src/lib/contabil/estruturasPadrao.ts` (novo): árvores DRE e Balanço padrão Senior offline (fallback quando `/api/contabil/estrutura-padrao` estiver 404), permitindo que o usuário ao menos visualize a árvore proposta.

## Endpoints consumidos (novos)

Adicionar ao `docs/backend-dre-studio-endpoints.md`:

```
POST   /api/contabil/modelos/criar-padrao              body: { tipo, codemp, vincular_contas?: bool }
GET    /api/contabil/cache/execucoes?modelo_id
GET    /api/contabil/cache/periodos-status?modelo_id&anomes_ini&anomes_fim
GET    /api/contabil/snapshots?modelo_id
POST   /api/contabil/snapshots                         (materializa período)
GET    /api/contabil/cccc106/senior?codemp&anomes_ini&anomes_fim
POST   /api/contabil/cccc106/importar                  multipart CSV/XLSX
GET    /api/contabil/cccc106/conciliacao?modelo_id&anomes_ini&anomes_fim
GET    /api/contabil/diagnostico/ctared-zero?codemp&anomes_ini&anomes_fim
GET    /api/contabil/referencia-senior?tipo
POST   /api/contabil/referencia-senior/replicar        body: { modelo_id }
POST   /api/contabil/referencia-senior/validar         body: { modelo_id }
GET    /api/contabil/agendamentos
```

Enquanto não publicados: `describeDreStudioError` marca `endpoint_indisponivel` e cada painel exibe placeholder amigável (banner técnico + botão "reexecutar"), sem quebrar a página.

## Menu lateral

Em `AppSidebar.tsx`, sub-grupo "DRE Studio" (dentro de Contabilidade) volta a ser visível com itens:
- Modelos (index)
- Novo modelo
- Configurações
- Conciliação DRE × Balanço (link contextual — abre último modelo aberto ou primeiro ativo)
- Reprocessamentos / cache

Item bloqueado apenas por permissão (mesma flag já usada por Contabilidade). O banner técnico continua alertando 404 mas o menu permanece.

## Design system e comportamento

- Cores/typografia dos componentes portados são reescritas para tokens (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground` etc.) — sem cor hardcoded.
- Tema claro/escuro respeitado automaticamente.
- Notificações via `useToast` do portal, não `sonner`.
- Logs de navegação: cada rota nova é registrada em `screenCatalog.ts` para o `navegacaoLogger` capturar.
- Autenticação/permissões: rotas envolvidas pelo `AuthGuard` já usado pelas demais páginas de Contabilidade.

## Testes / verificação

- `tsgo` em todos os arquivos novos e alterados.
- Playwright: abrir `/contabilidade/dre-studio`, `/novo`, `/configuracoes`, `/:id/estrutura`, `/:id/conciliacao`, `/:id/visualizacao`; verificar que o banner técnico aparece com URL + status HTTP; screenshot de cada tela em modo claro e escuro; validar que `/health` do ERP continua isolado (falha do contábil não deixa o portal offline).

## Relatório final (será entregue ao concluir)

Arquivos criados, arquivos alterados, rotas adicionadas, itens de menu, permissões utilizadas, endpoints consumidos, referências antigas removidas, endpoints não encontrados (404), funcionalidades desabilitadas por falta de endpoint, resultado do `tsgo`, resultado dos testes Playwright, pendências.

## O que NÃO será feito

- Não trago `router.tsx`, `routeTree.gen.ts`, `server.ts`, `start.ts`, `__root.tsx` do zip (TanStack Start). O portal usa React Router — descartados.
- Não duplico componentes `ui/*` — reuso os do portal.
- Não crio novo cliente HTTP — reuso `contabilApi` já configurado.
- Não toco em `.env`, cliente Supabase, ou API principal do ERP.

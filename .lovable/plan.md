# Editor de dashboard em Manutenção de Frota

Replicar para `/frota` toda a experiência de edição que existe em `/passagens-aereas`: layout editável (drag-drop, redimensionar, ocultar/restaurar), criação de gráficos customizados via biblioteca BI, configuração de gráficos e persistência por banco. O botão "Editar registro" já existe na coluna Ações — mantido.

## Visão geral

Hoje `FrotaDashboard` é estático (grid fixo de cards). Vamos trocá-lo por um `FrotaLayoutGrid` análogo ao `PassagensLayoutGrid`, alimentado por um hook `useFrotaLayout`, que lê/grava o layout em `dashboards`/`dashboard_widgets` com `module = 'frota'`. Os 8 dados/charts atuais viram **widgets canônicos**; usuário com permissão de edição em `/frota` pode mover, redimensionar, ocultar, restaurar e adicionar gráficos customizados (mesmo `AddChartDialog` / `ConfigureChartDialog` da biblioteca BI).

## 1. Backend (Cloud)

Migração única:

- `upsert_frota_dashboard_default()` — espelho do equivalente de passagens, registra os 8 widgets canônicos no dashboard default do módulo `frota`.
- `get_frota_layout_via_token(_token)` — retorna o layout salvo para acesso público (link compartilhado).
- Políticas RLS adicionais em `dashboards` e `dashboard_widgets` (já têm RLS, basta adicionar):
  - `Frota editors manage default frota dashboard` (ALL) — `module = 'frota' AND owner_id IS NULL AND can_edit_frota(auth.uid())`.
  - `Frota editors manage default frota widgets` (ALL) análogo, joinando com `dashboards`.
- Garantir entradas no `visualCatalog` / `screenCatalog` que já existem (`frota.chart-*`) cobrindo todos os widgets canônicos.

## 2. Frontend

Arquivos novos (espelho dos de passagens):

- `src/hooks/useFrotaLayout.ts` — copy/paste de `usePassagensLayout.ts` substituindo `passagens-aereas` por `frota`, `can_edit_passagens` por `can_edit_frota`, `get_passagens_layout_via_token` por `get_frota_layout_via_token`, `upsert_passagens_dashboard_default` por `upsert_frota_dashboard_default`, e ajustando `FROTA_DEFAULT_WIDGETS` com os 8 tipos canônicos:
  - `kpis-row`, `chart-evolucao-mensal`, `chart-segmento`, `chart-top-veiculos`, `chart-top-fornecedores`, `chart-top-cc`, `chart-top-motoristas`, `tabela-registros`.
- `src/components/frota/FrotaLayoutGrid.tsx` — grid (react-grid-layout) reaproveitando o mesmo padrão de `PassagensLayoutGrid`, com slot para renderizar cada widget por tipo.
- `src/components/frota/AddChartDialog.tsx` e `ConfigureChartDialog.tsx` — versões idênticas às de passagens, alimentadas pelo `COMPONENT_REGISTRY` da biblioteca BI; chaves de mapping referenciam datasets do dataset Frota (evolução mensal, por segmento, top veículos, top fornecedores, top centros de custo, top motoristas, registros).

Mudanças em arquivos existentes:

- `src/components/frota/FrotaDashboard.tsx`:
  - Manter toda lógica de filtros, cross-filter e drill-down já implementada.
  - Em vez do JSX fixo dos cards, montar um `PageDataContext` com os datasets (`kpis`, `porMes`, `porSegmento`, `topVeiculos`, `topFornecedores`, `topCC`, `topMotoristas`, `crossFiltered`, `cols`) e renderizar via `FrotaLayoutGrid`.
  - Manter o card "Drill-down hierárquico" como widget canônico opcional (ou bloco fixo abaixo do grid — definição final no implementador).
  - Adicionar a barra de modo "Editar layout" com botões: Editar/Cancelar/Salvar, Novo gráfico, Restaurar bloco, Restaurar padrão (lógica idêntica ao trecho de passagens linhas 846–945).
- `src/pages/ManutencaoFrotaPage.tsx`: nenhuma mudança estrutural, pois o dashboard mantém a mesma interface (`data`, `loading`, `onEdit`, `onDelete`).
- `src/pages/ManutencaoFrotaCompartilhadoPage.tsx`: passar `shareToken` para o `useFrotaLayout` quando renderizar o dashboard via link público, exatamente como faz `PassagensAereasCompartilhadoPage`.

## 3. Permissões e visibilidade

- Reuso integral do sistema atual: edição liberada por `can_edit_frota`. Quem só tem `can_view` enxerga o dashboard com o layout salvo, sem botões de edição.
- Para o link público compartilhado, os widgets ocultos via `hidden_visuals` continuam respeitados, agora junto com o layout salvo (mesmo comportamento de passagens).

## Detalhe técnico

Por causa do volume de código (~2 700 linhas em passagens), o implementador deve **copiar e adaptar arquivo por arquivo**, sem tentar generalizar agora. Mais à frente, depois que Frota estiver no ar, vale extrair um `useModuleDashboardLayout(module)` genérico — mas isso é um refator separado, fora do escopo desta entrega.

## Fora de escopo

- Não criar tabela de catálogo de veículos.
- Não mexer no `ImportarFrotaDialog` nem no `FrotaShareLinksDialog`.
- Não tocar nas migrações já existentes.

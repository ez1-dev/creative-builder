## Situação atual (auditoria rápida)

A maior parte do pedido já está no código:

- `useResultadoCache` (src/hooks/contabil/api.ts:715) chama `GET /api/contabil/modelos/{modelo_id}/resultado-cache` já enviando `incluir_drills=true` — vale para DRE **e** Balanço (mesma tela `DreStudioVisualizacaoPage`).
- `linha.drills_menu` é preservado no normalizador (api.ts:438) e tipado em `src/types/contabil.ts`.
- `src/lib/contabil/drillsMenu.ts` faz `possuiDrill` (só ativa se `drillavel===true` e há itens) e `agruparDrillsMenu` (REABRIR primeiro, CONSULTA depois) — sem hardcode.
- `src/components/dre-studio/DrillsMenu.tsx` renderiza cada grupo com `DropdownMenuLabel` (cabeçalho da seção) e cada item como opção clicável usando `item.label`.
- Na matriz (`DreStudioVisualizacaoPage.tsx` ~2541) o menu é montado a partir de `linha.drills_menu` e o `onSelect` envia `modelo_id`, `linha_id`, `agrupar_por` (raw + normalizado), `anomes_ini/fim`, `codemp`, `codfil`, `centro_custo`, `modo_balanco`.
- `fetchDrillDre` (src/lib/contabil/drillDreApi.ts:123) já usa `params.endpoint` (default `/api/contabil/drill-dre`) — respeita o endpoint que vier do próprio item.

Único gap real vs. a spec: quando não há filial selecionada, o Balanço **não** força `consolidado=true` no `resultado-cache`. Hoje só envia `consolidado` quando o usuário liga o toggle. A spec pede: `&incluir_drills=true&consolidado=true (ou &codfil=)`.

## Mudança proposta (mínima, só frontend)

1. `src/hooks/contabil/api.ts` (`useResultadoCache`)
   - Se `filtros.codfil` for `null/undefined` e `filtros.consolidado` não foi explicitamente definido, enviar `consolidado: true`. Isso cobre a regra "consolidado=true OU codfil".
   - Não alterar assinatura pública nem outros parâmetros.

2. Sanity check visual (sem edição) na `DreStudioVisualizacaoPage`:
   - Confirmar que o botão do `DrillsMenu` está visível ao lado do label da linha quando `drillavel===true`.
   - Confirmar cabeçalhos "REABRIR" / "CONSULTA" na abertura.

## O que **NÃO** vou mudar

- Backend, endpoints, regras contábeis — nada.
- `DrillsMenu` / `drillsMenu.ts` — já cumprem a spec.
- Comportamento de clique da linha (expandir/recolher) — o menu continua no ícone dedicado (Search) para não conflitar com o toggle de filhos.

## Verificação

- Abrir `/contabilidade/dre-studio/modelo/{id}` num modelo de Balanço sem filial e inspecionar a request `resultado-cache` no DevTools: deve conter `incluir_drills=true&consolidado=true`.
- Abrir o menu numa linha do Balanço com `drillavel:true` e confirmar grupos REABRIR + CONSULTA vindos do backend.
- Selecionar um item CONSULTA (ex.: Conta Contábil): request vai para `item.endpoint` com `modelo_id`, `linha_id`, `agrupar_por`, `anomes_ini/fim`.

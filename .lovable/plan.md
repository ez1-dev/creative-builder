## Auditoria — Drills da tela "01 — Resumo da Folha"

Escopo: `src/pages/rh/ResumoFolhaPage.tsx`, `src/components/rh/KpiOrMissing.tsx`, `src/lib/rh/api.ts`, `src/lib/rh/types.ts`, `src/hooks/dashboardGeral/useRh.ts`.

### Veredito global
**Nenhum drill do Resumo da Folha está implementado no frontend.** A tela hoje é somente leitura de KPIs; não há leitura de `drills_menu`, não há chamada a `/api/rh/resumo-folha/drill`, não há drawer, não há clique nos cards, não há tratamento de `meta.aviso`, `pecas_pendentes`, `meses_sem_planilha` no contexto de drill, e não há tratamento de erro 422 do endpoint de drill.

Os únicos "drills" existentes no módulo RH pertencem a outras telas: `TurnoverDrillModal`, `QuadroDrillModal`, `AbsenteismoDrillModal`, `ProgramacaoFeriasDrillModal` — nenhum reutilizado pelo Resumo da Folha.

### Evidências

**1. Endpoint dashboard é chamado, mas `drills_menu` é ignorado**
`src/lib/rh/api.ts:313`
```ts
const resp = await api.get<any>("/api/rh/resumo-folha/dashboard", params);
const normalizado = normalizeDashboard(resp ?? {});
console.log("[RH ResumoFolha] dashboard", {
  params, kpis_raw: resp?.kpis, kpis_normalizados: normalizado.kpis,
  _missing_kpis: normalizado._missing_kpis,
  filiais: resp?.filiais?.length, mensal: resp?.mensal?.length,
});
```
Nenhuma referência a `drills_menu` em `api.ts`, `types.ts`, `useRh.ts` ou na página (`rg -n "drills_menu" src/` = 0 ocorrências).

**2. Cards não são clicáveis**
`src/pages/rh/ResumoFolhaPage.tsx:310-321` — grid de `<KpiOrMissing ...>`. `KpiOrMissing` (`src/components/rh/KpiOrMissing.tsx`) não expõe `onClick`, `role="button"`, dialog ou drawer. `rg -n "onClick|Dialog|Drawer" src/components/rh/KpiOrMissing.tsx` = 0 ocorrências.

**3. Endpoint de drill não é consumido em lugar algum**
`rg -n "resumo-folha/drill" src/` = 0 ocorrências.

### Checklist item a item

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| 1 | Todos os cards de `drills_menu` clicáveis | **AUSENTE** | `KpiOrMissing` sem handler; nenhum wrapper |
| 2 | Lista drillável vem do backend | **AUSENTE** | `drills_menu` nunca lido |
| 3 | Agrupamentos vêm de `drills_menu[].agrupamentos` | **AUSENTE** | idem |
| 4 | Drawer/modal reutilizável para o drill | **AUSENTE** | não existe `ResumoFolhaDrill*` |
| 5 | Primeiro agrupamento carregado ao abrir | **AUSENTE** | sem drawer |
| 6 | Trocar de aba refetcha | **AUSENTE** | sem drawer |
| 7 | `anomes_ini/fim` = filtros ativos | **AUSENTE** | drill não chamado |
| 8 | `cd_filial` enviado quando aplicável | **AUSENTE** | drill não chamado |
| 9 | Renderiza `itens[]` (label/valor/qtd) | **AUSENTE** | sem tela |
| 10 | `total` no rodapé | **AUSENTE** | sem tela |
| 11 | Comparação `total` × valor do card | **AUSENTE** | sem tela |
| 12 | `fonte` como legenda | **AUSENTE** | sem tela |
| 13 | `meta.aviso` exibido | **AUSENTE** | sem tela |
| 14 | `meta.pecas_pendentes` exibido | **AUSENTE** | sem tela |
| 15 | `meta.meses_sem_planilha` exibido | **AUSENTE** | sem tela |
| 16 | HTTP 422 mostra `detail` | **AUSENTE** | sem tela |
| 17 | V.A. usa apenas agrupamentos do backend | **AUSENTE** | sem tela |
| 18 | Provisões/Custo Total oferecem "Por componente" quando retornado | **AUSENTE** | sem tela |
| 19 | Sem listas fixas duplicando cards/agrupamentos | **N/A (limpo)** | nada foi introduzido — não há hardcode porque não há drill |
| 20 | Filtros/posição preservados ao fechar | **AUSENTE** | sem drawer |

### Cards esperados vs cards renderizados hoje
Renderizados por `ResumoFolhaPage.tsx:310-321`: `salario_base`, `salario_bruto` (extra, não está na lista de drill), `outras_gratificacoes`, `beneficios`, `va`, `inss_total`, `fgts`, `rescisoes`, `custo_total`, `hora_extra`, `provisoes`, `custo_ferias`. **Faltando na UI mesmo antes do drill**: `provento`, `desconto`, `total_liquido`. Precisarão existir (ou serem exibidos de outra forma) para poderem receber clique de drill segundo `drills_menu`.

### Payloads reais
Não capturados nesta auditoria — o console do preview atualmente está em outra rota (`/rh/resumo-folha` foi aberta pelo usuário mas não há log recente de `[RH ResumoFolha] dashboard` visível na janela). Recomendo capturar em `Fev/2026` após implementar (item na próxima etapa).

### Arquivos/componentes que precisarão mudar
- `src/lib/rh/types.ts` — tipos `DrillsMenuItem`, `ResumoFolhaDrillResponse`, `ResumoFolhaDrillItem`, `ResumoFolhaDrillMeta` e campo `drills_menu` em `ResumoFolhaDashboard`.
- `src/lib/rh/api.ts` — propagar `drills_menu` em `normalizeDashboard`; nova `fetchResumoFolhaDrill({ card, agrupar_por, anomes_ini, anomes_fim, cd_filial? })` com tratamento explícito de 422→`detail`.
- Novo `src/components/rh/ResumoFolhaDrillDrawer.tsx` — drawer reutilizável com abas por agrupamento, tabela (label/valor/qtd), rodapé com `total` + delta versus valor do card, `fonte` como legenda, `meta.aviso/pecas_pendentes/meses_sem_planilha`, empty/loading/error (incluindo 422).
- `src/components/rh/KpiOrMissing.tsx` — aceitar `onClick`/`drillable` opcional (visual: cursor-pointer, hover, focus ring, `role="button"`, `tabIndex=0`, aria-label).
- `src/pages/rh/ResumoFolhaPage.tsx` — mapa `card → KpiOrMissing`, marcar drillable a partir de `dashboard.drills_menu`, abrir o drawer passando o `card`, `label` e `agrupamentos` originais + filtros ativos (`anomes_ini`, `anomes_fim`, `filial`) e valor do card para comparação.
- Adicionar os cards ausentes (`provento`, `desconto`, `total_liquido`) para permitir drill sobre eles.

## Correções ainda necessárias (para próxima etapa em build mode)

1. Adicionar `drills_menu` aos tipos e ao normalizador.
2. Criar `fetchResumoFolhaDrill` com `card`, `agrupar_por`, `anomes_ini`, `anomes_fim`, `cd_filial?`; tratar 422 com `detail`.
3. Criar `ResumoFolhaDrillDrawer` reutilizável (abas por agrupamento, tabela, total, delta vs card, fonte, meta.*).
4. Tornar `KpiOrMissing` clicável quando o card estiver em `drills_menu`.
5. Renderizar cards que hoje faltam (`provento`, `desconto`, `total_liquido`) para cobrir os cards drilláveis do backend.
6. Ligar filtros ativos (período + filial) ao drill; preservar posição de rolagem/filtros ao fechar.
7. Ao trocar de aba refazer o fetch com o `agrupar_por` correspondente.
8. Toast/error state para 422 mostrando `detail`.
9. Validação em fevereiro/2026: capturar `[RH ResumoFolha] dashboard` (para conferir `drills_menu`) e o novo log `[RH ResumoFolha] drill` (payload por card) e conferir se o `total` de cada agrupamento bate com o valor do card.
10. Não introduzir listas fixas de cards nem de agrupamentos — tudo derivado de `drills_menu`.

**Aprovar este plano** para eu implementar as correções acima na próxima etapa (build).

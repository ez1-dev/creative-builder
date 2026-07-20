
# Dashboard Geral — repaginação completa

O print atual mostra a raiz do problema: KPIs zerados, gráficos vazios, layout genérico e um único spinner que trava a tela até tudo carregar. O plano ataca performance, visual e conteúdo — em todas as abas — usando a Biblioteca BI já consolidada.

## 1. Performance (carregar rápido)

Hoje `useDashboardGeral` faz 7 chamadas ao mesmo tempo e a Visão Geral ainda dispara +4 hooks (`useFinanceiro`, `useContabilidade`, `useEstoque`, `useProducao`). O `loading` da página só é `false` quando TUDO chega — o endpoint mais lento (Contabilidade/DRE) domina o tempo percebido.

Mudanças:

- **Loading por bloco, não por página.** Cada `KpiCard` e cada gráfico recebe seu próprio `loading` derivado do hook que o alimenta. Cards prontos aparecem imediatamente; só o card lento mostra skeleton.
- **Prefetch da aba Visão geral.** Ao entrar na página, pré-buscar em paralelo os hooks das abas mais acessadas (Comercial, Compras, RH) com `staleTime` alto — troca de aba fica instantânea.
- **Cache agressivo + placeholderData.** Elevar `staleTime` para 10 min nas séries mensais/YTD (dados que não mudam intra-dia) e usar `placeholderData: keepPreviousData` para não zerar a UI durante refetch de período.
- **Deduplicar chamadas.** Hoje `VisaoGeralTab` chama `useEstoque/useProducao/useFinanceiro/useContabilidade` que também rodam nas abas específicas — unificar em um único `QueryClient` key para evitar refetch quando o usuário troca de aba.
- **Remover `console.log` de debug** do hook orquestrador (roda a cada render).
- **Timeouts curtos + retry 0** já existem; adicionar `abortSignal` para cancelar em unmount/troca rápida de período.

## 2. Visual (Biblioteca BI)

Substituir os cards artesanais por componentes da Biblioteca BI (`@/components/bi`), mesmo padrão já usado no BI Comercial:

- **KPIs**: trocar por `KpiStatusCard` com barra lateral colorida, ícone, valor grande, delta (▲/▼) e sparkline miniatura quando houver série mensal. Estados: `loading` (skeleton), `error` (chip cinza "sem dados"), `stale` (badge "cache").
- **Gráficos**: usar `LineChartCard`, `BarChartCard`, `DonutChartCard`, `TableCard` da biblioteca — todos já com header padronizado, empty-state, ações (expandir, exportar), tooltip formatado.
- **Grid responsivo**: KPIs em 2/3/4/6 colunas por breakpoint com `gap-4`; gráficos em `lg:grid-cols-3` para caber 3 blocos por linha.
- **Estados vazios** substituídos pelo `EmptyStateCard` da biblioteca (ícone + texto + CTA "Configurar fonte" quando aplicável).
- **Tokens semânticos apenas** (nada de `text-white`/hex hardcoded).

## 3. Layout geral da página

```text
┌─ Header (título + período pills + Atualizar + botão "Personalizar") ─┐
│                                                                       │
├─ Faixa "Alertas críticos" (só aparece se houver: rupturas, meta <80%, │
│   inadimplência, absenteísmo alto) — chips clicáveis                  │
│                                                                       │
├─ Tabs (Visão geral · Comercial · Compras · Financeiro · Contab · RH · │
│         Produção · Estoque · Manutenção)                              │
│                                                                       │
├─ Aba Visão Geral                                                      │
│   ├ Linha 1: 4 KPIs headline (Faturamento, Meta%, Resultado, Custo)   │
│   ├ Linha 2: 4 KPIs operacionais (Headcount, Turnover, OPs, Rupturas) │
│   ├ Linha 3: 3 gráficos (Fat 12m, Compras 12m, Turnover 12m)          │
│   ├ Linha 4: 2 breakdowns (Top revendas · Compras por tipo)           │
│   └ Insights IA (mantido, melhorado com skeleton)                     │
│                                                                       │
├─ Demais abas: mesma anatomia (KPIs → séries → breakdowns → tabela)    │
└───────────────────────────────────────────────────────────────────────┘
```

## 4. Conteúdo (o que aparece)

Por aba, garantir a "trilha executiva" mínima usando o que o backend já expõe:

- **Visão geral**: 8 KPIs headline + Faturamento vs Meta 12m + Compras 12m + Turnover 12m + Top revendas + Insights IA.
- **Comercial**: KPIs (faturamento, meta%, ticket, clientes ativos) + série mensal + top revendas + top produtos + drill.
- **Compras**: valor comprado, pendente, OCs, fornecedores + série 12m + por tipo + por depósito.
- **Financeiro**: DRE resumido (receita, custo, resultado, margem%) + evolução resultado + top contas.
- **Contabilidade**: Ativo/Passivo/PL + Resultado do exercício + composição do ativo.
- **RH**: Headcount, admissões, demissões, turnover, absenteísmo + evolução + custo folha.
- **Produção**: OPs em aberto, kg produzido, ocupação, lead-time + evolução + top gargalos.
- **Estoque**: itens totais, abaixo/acima min-máx, sem política + top rupturas + valor imobilizado.
- **Manutenção**: gasto mês, top veículos, por categoria + evolução mensal.

## 5. Detalhes técnicos

- Arquivos afetados (edição, sem quebrar contratos):
  - `src/hooks/useDashboardGeral.ts` — remover log, `keepPreviousData`, `staleTime` 10 min, retornar `loadingByBlock`.
  - `src/pages/DashboardGeralPage.tsx` — nova faixa de alertas críticos, prefetch das abas quentes.
  - `src/pages/dashboard-geral/tabs/*.tsx` — trocar cards por componentes da Biblioteca BI, aplicar loading por bloco, adicionar breakdowns faltantes.
  - `src/components/bi/kpis/KpiStatusCard.tsx` — evoluir para aceitar `sparkline?`, `delta?`, `hint?` (usado em todas as abas).
- Sem mudanças em backend/edge functions. Sem migração de schema.
- Manter tokens semânticos do design system (azul corporativo, sem cor hardcoded).
- Testes: build + typecheck automático; validação visual via Playwright na rota `/dashboard-geral` para cada aba (screenshot antes/depois).

## 6. Entrega faseada

1. **Fase A (base)** — Performance + Visão Geral repaginada + KpiStatusCard evoluído.
2. **Fase B** — Comercial, Compras, Financeiro.
3. **Fase C** — Contabilidade, RH, Produção.
4. **Fase D** — Estoque, Manutenção + faixa de alertas críticos + prefetch.

Cada fase é entregável independente — a Fase A já resolve o "muito ruim" percebido no print.

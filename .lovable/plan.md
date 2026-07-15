## Objetivo

Eliminar o "piscar" de cards/gráficos do Dashboard Geral quando a API demora ou refaz fetch em segundo plano, e substituir o bloco vermelho de erro por uma faixa discreta que preserva o layout.

## Diagnóstico

- Hoje `statusFrom` marca `'carregando'` sempre que `isFetching` é true → cada refetch em background reseta cards para skeleton, causando flicker.
- `LoadingState` skeleton é genérico (3 barrinhas) e não lembra o formato do gráfico/KPI, gerando salto visual quando os dados chegam.
- `ErrorState` ocupa a área inteira do gráfico e "sequestra" o dashboard quando um único endpoint falha.
- Não há delay mínimo: skeletons aparecem/somem em ms, gerando flash em cache-hits rápidos.

## O que vai mudar

### 1. Diferenciar primeira carga de refetch em background

`src/hooks/dashboardGeral/shared.ts`

- `statusFrom` deixa de tratar `isFetching` como `'carregando'`. Só `isLoading` (primeira carga sem `data`) devolve `'carregando'`; refetch com `data` presente mantém `'ok'`/`'parcial'`.
- Novo tipo auxiliar `ModStatus` ganha `refetching?: boolean` opcional exposto pelos hooks (para futuros indicadores sutis, sem trocar o corpo do card).
- Sem alteração de assinatura pública dos hooks (`data`/`status` seguem iguais); os 8 hooks continuam usando `statusFrom` com o novo comportamento.

### 2. Skeleton anti-flicker (delay mínimo)

Novo hook `src/hooks/useDelayedFlag.ts` — retorna `true` só depois de N ms (default 200 ms) para evitar flash em respostas rápidas.

`src/components/bi/states/LoadingState.tsx`

- Novas variantes visuais coerentes com o conteúdo: `'bars'`, `'line'`, `'donut'`, `'kpi'`, `'skeleton'` (mantém default). Cada uma renderiza um esqueleto com a silhueta aproximada do gráfico, evitando "salto" quando os dados chegam.
- Adiciona `delayMs?: number` (default 200) — usa `useDelayedFlag` para só mostrar o skeleton após o delay.

### 3. Erro discreto sem sequestrar o card

Novo `src/components/bi/states/InlineError.tsx`

- Faixa fina (h ≈ 40 px) com ícone `AlertTriangle` amber, mensagem curta e botão "Tentar novamente" opcional. Não expande para altura cheia.

`src/components/bi/charts/ChartCardShell.tsx`

- Novas props: `errorVariant?: 'full' | 'inline'` (default `'inline'`), `onRetry?: () => void`, `loadingVariant?: 'skeleton'|'bars'|'line'|'donut'`.
- Se `error && errorVariant === 'inline'`: renderiza `InlineError` sobre uma área com altura `effHeight/2` — mantém o card no grid.
- Passa `loadingVariant` para `LoadingState`.

`src/components/bi/kpis/KpiCard.tsx`

- Adiciona `error?: string | null` + `onRetry?: () => void`: quando setado, renderiza um bloco compacto (ícone amber + texto curto) no lugar do valor, sem colapsar o card.
- `loading`: aplica `useDelayedFlag(200)` e, se `value != null` (stale), mantém o valor anterior com uma opacidade sutil (`opacity-70`) em vez de trocar por Skeleton — elimina flicker em refetches.

### 4. Integração nas abas

Nas 9 abas do Dashboard Geral (`src/pages/dashboard-geral/tabs/*.tsx`), sem mudar layout:

- Encaminhar `error={hook.error}` e `onRetry={hook.refetch}` (quando disponíveis) aos `ChartCardShell` e `KpiCard` principais.
- Escolher `loadingVariant` por tipo de gráfico (bars/line/donut) nos cards de destaque.
- Nenhuma mudança em lógica de negócio, hooks de dados ou schemas Zod.

### 5. Testes / verificação

- Ampliar `src/lib/dashboardGeral/schemas/__tests__/parse.spec.ts` só se necessário — foco principal é UI, então adicionamos:
  - `src/components/bi/states/__tests__/useDelayedFlag.spec.ts` cobrindo delay e cancelamento.
- Verificação manual via Playwright em `/dashboard-geral` com throttling: (a) primeira carga mostra skeletons no formato do gráfico; (b) refetch não pisca; (c) falha de um endpoint mostra faixa amarela discreta sem sumir com o restante.

## Arquivos

Novos:
- `src/hooks/useDelayedFlag.ts`
- `src/components/bi/states/InlineError.tsx`
- `src/components/bi/states/__tests__/useDelayedFlag.spec.ts`

Editados:
- `src/hooks/dashboardGeral/shared.ts`
- `src/components/bi/states/LoadingState.tsx`
- `src/components/bi/charts/ChartCardShell.tsx`
- `src/components/bi/kpis/KpiCard.tsx`
- 9 arquivos em `src/pages/dashboard-geral/tabs/`

Fora do escopo: schemas Zod, hooks de dados, endpoints, layout das abas.
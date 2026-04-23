

## Testes do toggle "Só c/ inconsistência" no `KpiDeepSheet`

### Objetivo
Garantir, via Vitest + Testing Library, que:
1. O toggle **fica oculto** quando `kind.kind` é de problema (`discrepancias`, `semInicio`, `semFim`, `fimMenorInicio`, `acima8h`, `abaixo5min`).
2. O toggle **aparece e funciona** em drills neutros (`total`, `status`, `emAndamento`, `finalizadas`, `maiorTotalDia`) — alternar `setSomenteInconsist` filtra a lista de OPs (some quem tem `inconsistencias === 0`).
3. O hint "Recorte já contém apenas linhas com inconsistência deste tipo." aparece somente nos drills de problema.

### Mudanças

**1. `src/pages/AuditoriaApontamentoGeniusPage.tsx`**
- Adicionar `export` nomeado a `KpiDeepSheet` (continua sendo usado internamente como hoje). Sem mudança de comportamento.

**2. Novo arquivo `src/pages/__tests__/KpiDeepSheet.test.tsx`**
- Importa `KpiDeepSheet` e renderiza dentro de `<TooltipProvider>` (caso necessário).
- Mocks mínimos: `linhas` com 2 OPs distintas — uma com inconsistência (`hora_inicial` vazia → `semInicio`) e uma totalmente consistente — para validar o filtro nos casos neutros.
- Helper `renderSheet(kind, somenteInconsist=false)` que monta o componente com props controladas via `useState` wrapper para testar o toggle real.
- Casos de teste:
  - **Drill de problema (`acima8h`)**: 
    - `queryByLabelText(/Só c\/ inconsist/i)` → `null`
    - `getByText(/Recorte já contém apenas linhas/i)` → presente
  - **Drill de problema (`semInicio`)**: idem (mesmas duas asserções).
  - **Drill neutro (`total`)**:
    - Toggle visível (`getByLabelText(/Só c\/ inconsist/i)`).
    - Hint ausente.
    - Inicialmente exibe as 2 OPs; após `userEvent.click(toggle)`, exibe apenas a OP com `inconsistencias > 0`.
  - **Drill neutro (`status` letra `A`)**: toggle visível e funcional (mesma asserção de filtragem).

### Detalhes técnicos
- Usar `@testing-library/react` (`render`, `screen`, `within`) e `@testing-library/user-event`.
- Stub de props não essenciais (`onAbrirDrawerOp`, `onFiltrarGridPorOp`, `setBusca`, `setOrdem`, `setOpExpandida`) com `vi.fn()`.
- Para identificar as OPs renderizadas, usar `numero_op` único nas linhas mock e procurar por texto.
- `discrepanciasParciais=false`, `totalRegistros=2`, `paginaCarregada=2`.
- Não há necessidade de mockar `supabase` ou `react-router` porque `KpiDeepSheet` é puro/UI.

### Como rodar
`npx vitest run src/pages/__tests__/KpiDeepSheet.test.tsx`

### Fora de escopo
- Testes E2E (Playwright).
- Testes de outras partes da página (`OpLinhasInline`, drawer, KPIs).
- Refatorar `KpiDeepSheet` para arquivo separado.

### Resultado
Suite cobre as duas regras críticas do toggle (oculto em problema, funcional em neutro), prevenindo regressões futuras.


## Objetivo

Adicionar um teste de UI garantindo que os cards **Custo Total**, **Benefícios** e **Rescisões** da tela `RH - 01 Resumo Folha`:

1. Exibam **"Campo pendente na API"** quando `response.kpis.{custo_total|beneficios|rescisoes}` vier `null`.
2. Exibam o **valor formatado em BRL** quando a API retornar número.

## Abordagem

Testar a camada de normalização + o componente `KpiOrMissing` isoladamente, sem depender de rede nem do `ResumoFolhaPage` inteiro (que exige QueryClient, Router, Auth, etc.). Isso mantém o teste rápido e focado exatamente na regra pedida.

### Passos

1. **Extrair `KpiOrMissing`** de `src/pages/rh/ResumoFolhaPage.tsx` para um arquivo próprio `src/components/rh/KpiOrMissing.tsx` (mesma implementação, apenas movida) e reimportar na página. Sem mudança de comportamento.
2. **Criar `src/lib/rh/__tests__/api.kpis.test.ts`** cobrindo `normalizeDashboard`/`buildKpis` (função interna — exportar via re-export mínimo ou testar indiretamente chamando `fetchResumoFolhaDashboard` com `api.get` mockado):
   - `null` em `custo_total`/`beneficios`/`rescisoes` → aparecem em `_missing_kpis`.
   - Números válidos → `kpis.custo_total`, `kpis.beneficios`, `kpis.rescisoes` iguais aos valores.
   - String `"campo_pendente"` também vai para `_missing_kpis`.
3. **Criar `src/components/rh/__tests__/KpiOrMissing.test.tsx`**:
   - Render com `value={null}` e `missing={true}` → assert texto **"Campo pendente na API"**.
   - Render com `value={12345.67}` e `missing={false}` → assert que o valor formatado (`R$ 12.345,67`) aparece e que o texto pendente **não** aparece.
   - Repetir para os três títulos (Custo Total, Benefícios, Rescisões) via `it.each`.
4. Rodar `bunx vitest run` para confirmar verde.

## Detalhes técnicos

- Infra Vitest + Testing Library + jsdom já configurada (`vitest.config.ts`, `src/test/setup.ts`).
- Mock de `@/lib/api` via `vi.mock("@/lib/api", ...)` para o teste de `api.ts`.
- Formatação BRL: usar o mesmo `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` que o componente usa, para comparar via `toHaveTextContent` tolerante a NBSP.
- Nenhuma alteração de lógica de negócio, nenhum recálculo no front, nenhuma chamada real a API.

## Fora do escopo

- Não altera mapeamento existente em `KPI_ALIASES`.
- Não mexe em outros KPIs além dos três pedidos.
- Não adiciona testes E2E/Playwright.

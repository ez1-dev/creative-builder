## Objetivo
Substituir a página `/rh/programacao-ferias` por um dashboard novo que consome `GET /api/rh/programacao-ferias/dashboard?codemp=1`, no padrão visual do RH (igual à RH‑03 – Contrato Experiência).

## Endpoint
`GET /api/rh/programacao-ferias/dashboard?codemp=1` (Bearer JWT já é enviado pelo `api.get`).

Retorno:
- `kpis`: `ferias_vencidas`, `a_vencer_30`, `a_vencer_60`, `a_vencer_90`, `ferias_total`, `de_ferias`
- `limite_ferias_pivot`: `[{ ano, m1..m12, total }]`
- `programacao_proximos_90_dias`: `[{ colaborador, dt_inicio_periodo, dt_fim_periodo, dt_limite_saida, dt_programacao, qtd_dias_direito, qtd_dias_programado, qtd_dias_abono, qtd_dias_saldo }]`
- `primeiro_vencimento_sem_programacao`: `[{ empresa, filial, colaborador, dt_limite_saida, qtd_dias_direito, qtd_dias_saldo, qtd_dias_programado }]`

## Alterações

### `src/lib/rh/types.ts`
Adicionar tipos:
- `ProgramacaoFeriasKpis`
- `LimiteFeriasPivotRow` (`ano: string; m1..m12: number; total: number`)
- `ProgramacaoProximos90Item`
- `PrimeiroVencimentoSemProgramacaoItem`
- `ProgramacaoFeriasDashboard` (agrega os 4 acima)

### `src/lib/rh/api.ts`
Adicionar `fetchProgramacaoFeriasDashboard(codemp = 1)`:
- `api.get("/api/rh/programacao-ferias/dashboard", cleanParams({ codemp }))`
- Normaliza kpis com `num(...)` (todas as 6 chaves), arrays com fallback `[]`.
- Ordena `limite_ferias_pivot` por `ano` asc.
- Ordena `primeiro_vencimento_sem_programacao` por `dt_limite_saida` asc.

### `src/pages/rh/ProgramacaoFeriasPage.tsx` (reescrever)
Nova página no padrão da `ContratoExperienciaPage`:

1. `RhPageHeader title="RH - 04 - Programação de Férias"` + botão Sincronizar (padrão).
2. **6 KPI cards** em `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6` usando `KpiCard` com cores via prop `variant` + acento por classe:
   - Férias Vencidas → `variant="danger"` (vermelho), ícone `AlertOctagon`.
   - A Vencer 30 Dias → `variant="warning"` (âmbar), ícone `AlarmClock`.
   - A Vencer 60 Dias → cor verde-limão (`border-l-4 border-l-lime-500`), ícone `Clock`.
   - A Vencer 90 Dias → verde escuro (`border-l-4 border-l-green-700`), ícone `CalendarClock`.
   - Férias Total → `variant="info"` (azul), ícone `Users`.
   - De Férias → azul-marinho (`border-l-4 border-l-blue-900`), ícone `Palmtree`.
   Todos com `format="number"` e `loading={isLoading}`.
3. **Card "Limite Férias"** (largura total): tabela pivot com colunas `Ano | 01..12 | TOTAL`. Cabeçalho de meses com labels `Jan..Dez`. Célula = `-` quando `0`. `text-right tabular-nums`. Container `max-h-[40vh] overflow-auto` com `TableHeader sticky`.
4. **Grid 2 colunas** (`grid grid-cols-1 xl:grid-cols-2 gap-4`):
   - Card "Programação Próximos 90 Dias": colunas Colaborador, Data Início Período, Data Fim Período, Data Limite Saída, Data Programação, Q. Dias Direito, Q. Dias Programado, Q. Dias Abono, Q. Dias Saldo. `max-h-[55vh] overflow-auto`. Vazio → "Sem dados".
   - Card "1º Vencimento e Sem Programação": colunas Empresa, Filial, Colaborador, Data Limite Saída, Q. Dias Direito, Q. Dias Saldo, Q. Dias Programado. Ordenada por `dt_limite_saida` asc. Vazio → "Sem dados".
5. Datas: `formatDate` (pt‑BR dd/MM/yyyy — helper já existe em `@/lib/format`).
6. "Quant. Dias" com 2 casas: helper local `fmtQtd(v) = Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})`, com `-` para `null/undefined`.
7. `useQuery(['rh','programacao-ferias','dashboard',1], () => fetchProgramacaoFeriasDashboard(1))`.
8. Loading: `Skeleton` nas linhas + KpiCard `loading`. Erro: `sonner` toast — mensagem "Sessão expirada" se `error.statusCode === 401`, caso contrário "Falha ao carregar Programação de Férias" (via `useEffect` observando `isError`).
9. Sem filtros por enquanto.

### Rota
Já existe `/rh/programacao-ferias → ProgramacaoFeriasPage` em `src/App.tsx`. Nenhuma alteração.

## Fora de escopo
- Backend / fórmulas dos KPIs (`ferias_total`, `ferias_vencidas`) — ajuste pendente do usuário no UpQuery.
- Filtros por status/filial/CC.
- Menu lateral (a entrada RH‑04 já existe).

## Validação
- Build limpo.
- Página carrega, exibe 6 KPIs, pivot com meses e as duas tabelas lado a lado.
- 401 → toast "Sessão expirada".

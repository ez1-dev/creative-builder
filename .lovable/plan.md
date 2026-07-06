## RH-05 — Rotatividade / Turnover

Nova página de dashboard consumindo `GET /api/rh/turnover/dashboard`. Sem cálculo no front — apenas exibição, formatação e filtros de drill sobre os arrays já entregues pela API.

## Arquivos

### 1. `src/lib/rh/types.ts` (append)
Adicionar tipos:
- `TurnoverKpis` (admitidos, demitidos, saldo, headcount_inicio, headcount_fim, headcount_medio, taxa_rotatividade_pct)
- `TurnoverPorMes` (anomes, admitidos, demitidos)
- `TurnoverPorMotivo` (motivo, qtd)
- `TurnoverPorEmpresa` (label, admitidos, demitidos)
- `TurnoverAdmitidoDetalhe` (colaborador, matricula, empresa, filial, cargo, dt_admissao)
- `TurnoverDemitidoDetalhe` (idem + dt_demissao, motivo)
- `TurnoverDashboard` juntando tudo

### 2. `src/lib/rh/api.ts` (append)
`fetchTurnoverDashboard({ anomes_ini, anomes_fim, codemp = 1 })`:
- mesmo padrão das outras fetch RH (Bearer token, header `ngrok-skip-browser-warning`, tratamento 401)
- URL: `${getApiUrl()}/api/rh/turnover/dashboard?anomes_ini=...&anomes_fim=...&codemp=...`
- retorna `TurnoverDashboard`

### 3. `src/components/rh/TurnoverDrillModal.tsx` (novo)
Componente único parametrizado por `tipo: "admitidos" | "demitidos"`:
- props: `open`, `onOpenChange`, `titulo`, `itens`, `tipo`
- colunas condicionais: demitidos adiciona Data Demissão + Motivo
- ordena por data desc (dt_demissao para demitidos, dt_admissao para admitidos)
- helper local `formatDateBR` (parse manual YYYY-MM-DD, sem `new Date`)
- se vazio → "Sem dados"
- baseado em `QuadroDrillModal.tsx` (Dialog + Table + scroll)

### 4. `src/components/rh/TurnoverEmpresaDrillModal.tsx` (novo)
Modal com Tabs (`Admitidos` / `Demitidos`) reutilizando as tabelas internas do TurnoverDrillModal via export nomeado ou duplicando as tabelas (simples). Ou: reaproveitar o TurnoverDrillModal renderizando dois em um Tabs.

### 5. `src/pages/rh/TurnoverPage.tsx` (novo)
Página completa:
- `RhPageHeader` com título "RH-05 — Rotatividade / Turnover"
- filtros: dois `AnomesSelect` (mês inicial / mês final) + botão "Atualizar" + `SincronizarRhDialog` (padrão outras RH)
- estado inicial: ano corrente, `ini=YYYY01`, `fim=YYYYMM` (mês atual)
- `useQuery` com `queryKey: ["rh","turnover", ini, fim, codemp]` disparado só ao clicar Atualizar (ou automático — seguir padrão de `ProgramacaoFeriasPage`)
- 6 cards KPI em grid responsivo:
  1. Admitidos — clica → drill admitidos
  2. Demitidos — clica → drill demitidos
  3. Saldo — cor verde ≥0 / vermelho <0
  4. Taxa Rotatividade — `toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})` + "%"
  5. Headcount Médio — inteiro (ou 1 casa se vier fracionado)
  6. Headcount (Início / Fim) em card duplo
- Gráfico "Admissões x Demissões por Mês" — barras agrupadas via `BarChartCard` (biblioteca BI) OU Recharts inline se BarChartCard não suportar 2 séries; usar `BarChart` do Recharts com duas `<Bar>` (admitidos verde, demitidos vermelho); onClick da barra → drill filtrado por mês
- Tabela "Motivos de Desligamento" (`Motivo`, `Quantidade`) ordenada desc; linha clicável → drill demitidos filtrado por motivo
- Tabela "Por Empresa" (`Empresa`, `Admitidos`, `Demitidos`, `Saldo` = admitidos-demitidos) ordenada por total movimentação desc; linha → `TurnoverEmpresaDrillModal`
- Skeleton loading + toasts erro (401 / conexão)
- Helpers locais: `formatAnoMes`, `getAnoMesFromDate`, `formatDateBR`, `formatInt`, `formatPct2`

### 6. `src/App.tsx`
Registrar rota `/rh/turnover` → `TurnoverPage` (lazy import se seguir padrão).

### 7. `src/pages/rh/RhIndexPage.tsx`
Adicionar entry no `FALLBACK` e `ROTA_POR_CODIGO`:
- `{ codigo: "05", titulo: "Rotatividade / Turnover", rota: "/rh/turnover", icon: TrendingUp }`

## Regras não-negociáveis
- Nenhum cálculo de headcount/turnover no front. `saldo` da tabela Por Empresa é apenas exibição.
- Datas: parse manual `YYYY-MM-DD`, nunca `new Date` / `toLocaleDateString`.
- Cores via tokens semânticos (`text-emerald-600`/`text-destructive` já usados no projeto — verificar padrão RH atual antes; usar mesmos tokens dos outros KPIs RH).
- Sem consulta direta ao Cloud/Supabase — só FastAPI.

## Fora de escopo
- Exportação Excel (não pedida).
- Gráfico rosca de motivos (opcional, não incluído — só tabela).
- Backend / API.

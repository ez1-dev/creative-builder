## Objetivo

Adicionar drill-down completo até colaborador na página `/rh/programacao-ferias`, consumindo os novos campos `detalhe`, `de_ferias_detalhe` e `ativos_total` que já vêm do endpoint `GET /api/rh/programacao-ferias/dashboard?codemp=1`. Nenhuma alteração de backend, nenhuma chamada nova, nenhum recálculo — apenas filtros client-side sobre o payload.

## Escopo

Somente frontend, apenas os arquivos:

- `src/lib/rh/types.ts` — estender o tipo do dashboard com os novos campos.
- `src/pages/rh/ProgramacaoFeriasPage.tsx` — cards clicáveis, células pivot clicáveis, linhas da tabela "1º Vencimento" clicáveis, modal único de drill.
- `src/components/rh/ProgramacaoFeriasDrillModal.tsx` — novo componente reutilizável (Dialog do shadcn).

Fora do escopo: `src/lib/rh/api.ts` (a função já retorna o payload como veio), outras páginas RH, backend, KPIs, regras de férias.

## Passos

1. **Tipos** (`src/lib/rh/types.ts`)
   - Adicionar em `ProgramacaoFeriasDashboard`:
     - `ativos_total: number`
     - `ferias_vencidas_diagnostico?: { vencidas_estritas; ate_60_dias; ate_2_meses; ate_fim_2_meses; alvo_upquery }`
     - `detalhe: ProgramacaoFeriasDetalheItem[]`
     - `de_ferias_detalhe: DeFeriasDetalheItem[]`
   - Criar `ProgramacaoFeriasDetalheItem` com todos os campos do payload (`empresa, filial, colaborador, matricula, cargo, dt_inicio_periodo, dt_fim_periodo, dt_limite_saida, dt_programacao, qtd_dias_direito, qtd_dias_programado, qtd_dias_abono, qtd_dias_saldo, dias_ate_limite, ano_limite, mes_limite, status`).
   - Criar `DeFeriasDetalheItem` (`empresa, filial, colaborador, matricula, cargo, dt_inicio_ferias`).
   - Union type `StatusPeriodoFerias` para os 5 status.

2. **Modal reutilizável** (`src/components/rh/ProgramacaoFeriasDrillModal.tsx`)
   - Props: `open`, `onOpenChange`, `title`, `mode: "periodo" | "de_ferias"`, `rows`.
   - Título mostra contador: `"{title} — {n} {periodos|colaboradores}"`.
   - Baseado em `Dialog` do shadcn (fecha ao clicar fora e no botão Fechar por padrão).
   - `mode === "periodo"`: colunas Colaborador, Matrícula, Empresa, Filial, Cargo, Início Período, Fim Período, Limite Saída, Dias Direito, Dias Saldo, Dias Programado, Dias Abono, Status. Ordenar por `dt_limite_saida` asc.
   - `mode === "de_ferias"`: colunas Colaborador, Matrícula, Empresa, Filial, Cargo, Início das Férias. Ordenar por `colaborador` asc.
   - Badge de status:
     - VENCIDA → `bg-red-700 text-white`
     - A VENCER 30 DIAS → `bg-amber-500 text-white`
     - A VENCER 60 DIAS → `bg-lime-500 text-white`
     - A VENCER 90 DIAS → `bg-green-700 text-white`
     - A VENCER → `bg-slate-500 text-white`
   - Datas via `formatDateBR` local (mesmo regex já em uso).
   - Scroll vertical interno; largura máxima grande (`max-w-6xl`).

3. **Página** (`src/pages/rh/ProgramacaoFeriasPage.tsx`)
   - Estado local: `const [drill, setDrill] = useState<{title; mode; rows} | null>(null)`.
   - **Cards clicáveis** (envolver cada `<KpiCard>` em `<button>` full-width ou usar `onClick` + `className="cursor-pointer"` no wrapper):
     - Vencidas → `detalhe.filter(x => x.status === "VENCIDA")`, título `"Férias Vencidas"`.
     - A Vencer 30/60/90 → filtro por status correspondente.
     - Férias Total → abre modal especial com header:
       `"Férias Total = {ativos_total} colaboradores ativos + {ferias_vencidas} períodos vencidos"`,
       corpo lista os vencidos (`detalhe.filter(status === "VENCIDA")`). Implementar como uma prop opcional `headerNote?: string` no modal para não duplicar componente.
     - De Férias → `de_ferias_detalhe`, `mode="de_ferias"`.
   - **Pivot Limite Férias**: cada célula `m1..m12` com valor > 0 vira `<button>` com `onClick` que filtra `detalhe.filter(x => x.ano_limite === r.ano && x.mes_limite === idx+1)` e título `"Limite de Férias — MM/YYYY"`. Célula TOTAL > 0 filtra por `ano_limite === r.ano` e título `"Limite de Férias — Ano YYYY"`. Ordenar `pivot` por `ano` asc antes de renderizar. Adicionar `cursor-pointer hover:underline` nas células clicáveis.
   - **Tabela "1º Vencimento e Sem Programação"**: adicionar `onClick` em cada `<TableRow>` (`cursor-pointer hover:bg-muted/50`). Ao clicar, achar `detalhe.find(d => d.matricula === r.matricula && d.dt_limite_saida === r.dt_limite_saida)`. Se encontrar, abrir modal período com essa 1 linha e título `"Detalhes — {colaborador}"`. Se não encontrar, montar linha sintética a partir do próprio `r` para não quebrar. Ordenar array por `dt_limite_saida` asc.
   - Manter tabela "Programação Próximos 90 Dias" como está.

4. **Verificação**
   - `bun run build` para checar tipos.
   - Abrir preview manualmente em `/rh/programacao-ferias`: clicar em cada card, algumas células do pivot e uma linha da tabela 3; confirmar modal com contador, badges coloridas e datas em `DD/MM/YYYY`.

## Detalhes técnicos

- Continuar usando o hook `useQuery` já existente; apenas ler os novos campos do `data`.
- Reaproveitar o `formatDateBR` já definido na página (mover para dentro do modal também — cópia local, sem import de `@/lib/format` que tem o bug de fuso).
- Nenhuma nova dependência.
- Badges via `<Badge>` do shadcn com `className` custom (tokens Tailwind diretos aqui são aceitáveis pois representam semântica de status do ERP, mesmo padrão dos KPIs já existentes na página).

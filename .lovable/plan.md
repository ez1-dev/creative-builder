# RH-06 — Absenteísmo / Afastamentos

Nova página `/rh/absenteismo` seguindo o padrão das demais telas RH (Turnover como referência mais próxima).

## Arquivos novos
- `src/pages/rh/AbsenteismoPage.tsx` — página completa.
- `src/components/rh/AbsenteismoDrillModal.tsx` — modal de drill genérico com as 12 colunas exigidas.

## Arquivos alterados
- `src/lib/rh/types.ts` — adicionar tipos `AbsenteismoKpis`, `AbsenteismoDashboard` e itens (`AbsenteismoCategoriaItem`, `AbsenteismoMotivoItem`, `AbsenteismoMesItem`, `AbsenteismoEmpresaItem`, `AbsenteismoDetalheItem`).
- `src/lib/rh/api.ts` — adicionar `fetchAbsenteismoDashboard({ anomes_ini, anomes_fim, codemp })` e `getAbsenteismoExportUrl(...)` (usa `api.getExportUrl` que já anexa `access_token`).
- `src/App.tsx` — registrar rota protegida `/rh/absenteismo`.
- `src/pages/rh/RhIndexPage.tsx` — adicionar card/link "06 — Absenteísmo / Afastamentos".

## Dados / integração
- Dashboard: `api.get('/api/rh/absenteismo/dashboard', { anomes_ini, anomes_fim, codemp })` (Bearer já injetado pelo `ApiClient`, header `ngrok-skip-browser-warning` incluído no padrão).
- Excel: montar URL via `api.getExportUrl('/api/rh/absenteismo/exportar', {...})` e disparar download por `<a href=... download>` (browser lida com `Content-Disposition`); fallback de nome `rh_06_absenteismo_${ini}_${fim}.xlsx`.
- Nada é recalculado no front. KPIs, categorias, motivos e séries vêm prontos da API.
- Sem chamada direta ao Supabase.

## Layout
Header `RhPageHeader` com título "RH - 06 - Absenteísmo / Afastamentos" + ações (Sincronizar RH usando `SincronizarRhDialog` existente, Atualizar, Exportar Excel).

Filtros (Card): `AnomesSelect` para mês inicial e final + botão "Atualizar". Default: `ano-01` até mês atual.

**KPIs (6 cards)** com `KpiCard`:
1. Taxa de Absenteísmo — `taxa_absenteismo_pct` (2 casas + %), variante `danger`/destaque.
2. Afastamentos — `afastamentos` (int), clicável → drill `detalhe` completo.
3. Colaboradores Afastados — `colaboradores_afastados` (int), clicável → drill agrupado por colaborador.
4. Dias Perdidos — `dias_perdidos` (0–1 casa conforme retorno), clicável → drill completo.
5. Duração Média — `duracao_media_dias` (1 casa + " dias").
6. Headcount Médio — `headcount_medio` (0–1 casa conforme retorno).

**Gráfico 1 — Por Mês** (`por_mes`)
- Recharts `ComposedChart`: `Bar` para `afastamentos` (eixo Y esquerdo) + `Line` para `dias` (eixo Y direito).
- X: `formatAnoMes(anomes)`.
- Click em barra → drill `detalhe.filter(x => getAnoMesFromDate(x.dt_inicio) === anomes)`.

**Gráfico 2 — Por Categoria** (`por_categoria`)
- Rosca (`PieChart`/`Pie` com `innerRadius`) por `dias`.
- Tooltip customizado: categoria, dias, afastamentos, colaboradores.
- Click em fatia → drill `detalhe.filter(x => x.categoria === cat)`.

**Tabela — Por Empresa** (`por_empresa`)
- Colunas: Empresa, Afastamentos, Dias, Colaboradores.
- Ordenar por `dias` desc.
- Linha clicável → drill por `empresa === label`.

**Tabela — Por Motivo** (`por_motivo`)
- Colunas: Cód. (`codsit`), Motivo, Categoria, Absenteísmo? (Sim/Não), Afastamentos, Dias.
- Ordenar por `dias` desc.
- Linhas `absenteismo === false` renderizadas com `text-muted-foreground opacity-70` (contexto, não clicáveis).
- Linhas com `absenteismo === true` clicáveis → drill `detalhe.filter(x => String(x.codsit) === String(codsit))`.

## Drill modal (`AbsenteismoDrillModal`)
- Dialog shadcn com `onOpenChange` (fecha fora + botão Fechar).
- Título dinâmico com contador ex.: `"Motivo: X — N afastamentos"`.
- Tabela com scroll vertical (`max-h-[65vh]`) e 12 colunas: Colaborador, Matrícula, Cargo, Empresa, Filial, Motivo, Categoria, Cód. Situação, Início, Fim, Dias, CID.
- Ordenação por `dt_inicio` desc.
- Estado vazio: "Sem dados".

## Análise da IA
- Reaproveitar `AiInsightsPanel` já existente com um novo módulo — vou adicionar `"absenteismo"` no enum do painel e da edge function `rh-ai-insights` (título e foco: taxa, tendência mensal, categorias/motivos dominantes, empresas críticas, risco de saúde/prazo).
- Payload compacto: kpis, `por_mes`, top categorias, top 10 motivos com absenteismo=true, top 10 empresas por dias, contagem total de `detalhe`.

## Auxiliares
```ts
const formatAnoMes = (v) => { /* YYYYMM -> MM/AAAA */ };
const getAnoMesFromDate = (s) => /^(\d{4})-(\d{2})/.exec(s)?.slice(1).reverse().join("") ?? "";
// (usar mesma implementação de TurnoverPage, já testada)
```

## Fora de escopo
- Recalcular qualquer métrica no front.
- Novas tabelas/edge functions além da extensão do enum em `rh-ai-insights`.
- Filtros avançados além de mês ini/fim.

# Relatório PDF Gerencial de RH — Consolidado com IA

Criar um relatório PDF único que consolida os 6 módulos RH (Resumo Folha, Quadro de Colaboradores, Contratos de Experiência, Férias, Turnover, Absenteísmo) para um período comum, com análise de IA detalhada por seção, comparativos com período anterior e alertas priorizados.

## Fluxo do usuário

1. Nova página `/rh/relatorio-gerencial` (card no `RhIndexPage`).
2. Usuário escolhe `anomes_ini` e `anomes_fim` (filtro único aplicado a todos os módulos).
3. Ao clicar em **Gerar Relatório PDF**:
   - Frontend busca em paralelo os 6 dashboards para o período atual + o período anterior equivalente (mesmo tamanho de janela) para benchmarks.
   - Envia o payload consolidado (KPIs + agregados) para a edge function `rh-relatorio-ia`, que retorna análise estruturada por seção.
   - Frontend renderiza o PDF client-side com `@react-pdf/renderer` e dispara download.
4. Preview antes do download com botões **Baixar PDF** e **Regenerar Análise IA**.

## Estrutura do PDF

```text
Capa
  Título, período, empresa, data de geração, logo

Sumário Executivo (IA)
  3-5 highlights consolidados, principais riscos e oportunidades

1. Resumo da Folha
   KPIs (custo total, líquido, HE, benefícios, INSS, FGTS, provisões)
   Comparativo vs período anterior (Δ absoluto e %)
   Top 5 proventos e top 5 descontos
   Gráfico mensal (custo × líquido × HE)
   Análise IA: diagnóstico, tendências, riscos, recomendações, plano de ação

2. Quadro de Colaboradores
   Headcount, distribuição por filial/CC/cargo, faixa etária, tempo de casa
   Comparativo vs período anterior
   Análise IA idem

3. Contratos de Experiência
   Vigentes, a vencer 5/10 dias, demitidos pós-experiência
   Lista dos vencimentos críticos
   Análise IA: risco de perda, ações sugeridas

4. Férias
   Vencidas, a vencer 30/60/90, em gozo, sem programação
   Pivot por ano/mês
   Análise IA: risco trabalhista, exposição financeira, prioridades

5. Turnover
   Admissões, demissões, taxa, motivos
   Comparativo vs período anterior
   Análise IA: causas prováveis, benchmarks de mercado, ações

6. Absenteísmo / Afastamentos
   Dias perdidos, taxa %, top CIDs/motivos, top setores
   Comparativo vs período anterior
   Análise IA: padrões, riscos de saúde ocupacional, recomendações

Alertas Priorizados (IA)
  Lista consolidada ordenada por severidade (crítico / alto / médio)
  Cada alerta: título, seção de origem, impacto estimado, ação recomendada

Rodapé: gerado por Sapiens Control Center + IA em <data>, página X/Y
```

## Detalhes técnicos

**Dependências a instalar**
- `@react-pdf/renderer` (geração PDF client-side, permite gráficos SVG via `<Svg>`).

**Novos arquivos**
- `src/pages/rh/RelatorioGerencialPage.tsx` — filtros + orquestração + preview.
- `src/lib/rh/relatorio.ts` — `fetchRelatorioConsolidado(periodoAtual, periodoAnterior)`: dispara em paralelo os 6 fetchers já existentes em `src/lib/rh/api.ts` (`fetchResumoFolhaDashboard`, `fetchQuadroColaboradores`, `fetchContratoExperienciaDashboard`, `fetchProgramacaoFeriasDashboard`, `fetchTurnoverDashboard`, `fetchAbsenteismoDashboard`) e calcula deltas.
- `src/components/rh/pdf/RelatorioPdf.tsx` — documento `@react-pdf/renderer` com todas as seções.
- `src/components/rh/pdf/pdfStyles.ts` — StyleSheet usando cores do design system (mapeadas para hex, pois `@react-pdf/renderer` não lê CSS vars).
- `supabase/functions/rh-relatorio-ia/index.ts` — recebe payload consolidado, chama Lovable AI (`google/gemini-3-flash-preview`) via AI SDK com `Output.object` para retornar `{ sumario_executivo, secoes: {resumo_folha, quadro, ...}, alertas: [] }`. Reaproveita padrão de `rh-ai-insights`.

**Arquivos editados**
- `src/App.tsx` — rota `/rh/relatorio-gerencial` protegida.
- `src/lib/screenCatalog.ts` — código `RH_RELATORIO_GERENCIAL`.
- `src/components/AppSidebar.tsx` — item de menu no grupo RH.
- `src/pages/rh/RhIndexPage.tsx` — card destaque.

**Backend (edge function `rh-relatorio-ia`)**
- CORS + validação Zod do payload.
- Schema `Output.object` flat (sem `.min/.max`) — limites de tamanho no prompt, clamp em código.
- Fallback: se IA falhar (429/402/schema), gera PDF sem seções IA e mostra aviso.
- Sem consulta direta ao Supabase de negócio; apenas Lovable AI Gateway.

**Regras respeitadas**
- Nenhum fetch novo para o ERP; reusa fetchers RH atuais.
- Tokens de design mapeados manualmente para hex no PDF (limitação do renderer).
- Bearer token e chamadas mantidas via `api` helper (padrão das demais páginas RH).
- PDF salvo via download direto no navegador; nome `rh_relatorio_gerencial_${ini}_${fim}.pdf`.

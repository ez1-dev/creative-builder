## Objetivo
Incluir no **Relatório Executivo de Faturamento** um novo bloco **"Análise de Pareto (80/20)"** com gráfico clássico (barras decrescentes + linha de % acumulado e marcador 80%) e uma análise textual gerada pela IA específica para esse bloco.

## Escopo (somente frontend + edge function existente)

### 1. Novo bloco no catálogo
- Em `useRelatorioExecutivoFaturamento.ts`:
  - Adicionar `pareto: boolean` em `BlocosSelecionados`.
  - Incluir `pareto: true` em `BLOCOS_PADRAO` e `BLOCOS_CURTO`.
  - O bloco reutiliza os dados já carregados de `rankings` (revenda/estado/obras) + `detalhes` para derivar Pareto por cliente/produto sem nova chamada de API.

### 2. Componente `ParetoBloco`
- Arquivo: `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx` (novo export `ParetoBloco`).
- Permite escolher a dimensão analisada (clientes, revendas, produtos, obras) via tabs internas; padrão: **clientes** (derivado de `dados.detalhes` agregando `vl_bruto` por `cd_cliente`) e fallback para `revenda` se detalhes estiver vazio.
- Renderiza `ComposedChart` (Recharts):
  - Barras `Faturamento` ordenadas desc (top 20).
  - Linha `% Acumulado` em eixo Y direito (0–100%).
  - `ReferenceLine` horizontal em 80% (cor `--warning`).
  - Tooltip com valor absoluto + % individual + % acumulado.
- Mini-tabela abaixo destacando os itens **dentro dos 80%** (badge "Vital few") vs restante ("Useful many"), com contagens e participação.
- Resumo textual fixo: `X clientes (Y% do total) geram 80% do faturamento`.

### 3. Cálculo Pareto
- Helper interno `calcularPareto(rows, labelKey, valueKey)`:
  1. ordena desc, 2. calcula soma total, 3. acumula %, 4. marca `isVital` até `acumulado ≥ 80%`.
- Sem alteração de API/backend.

### 4. Wizard
- Em `RelatorioExecutivoFaturamentoPage.tsx`, adicionar item no `blocosCatalogo`: `{ k: 'pareto', l: 'Pareto 80/20', icon: <novo ícone> }` (usar `Target` do `lucide-react`).
- Renderizar `<ParetoBloco />` no preview entre Rankings e Margem.

### 5. Análise da IA
- Estender o payload enviado para `supabase/functions/relatorio-executivo-ia`:
  - Acrescentar campo `pareto` com `{ dimensao, total_itens, itens_vitais, pct_itens_vitais, pct_concentracao_top5, top: [{label, valor, pct, pct_acumulado}] }` (até 20 itens).
- Edge function `relatorio-executivo-ia/index.ts`:
  - Aceitar novo campo `pareto` no body.
  - Incluir no prompt instrução: "Se `PARETO` for fornecido, gere 1 destaque + 1 alerta + 1 recomendação **específicos** sobre concentração 80/20 (risco de dependência de poucos clientes, oportunidade de fidelização da cauda longa, etc.)".
  - Manter o mesmo schema de retorno (`destaques`/`alertas`/`recomendacoes`) — as conclusões do Pareto entram naturalmente nas listas existentes, sem quebrar UI atual.
- Opcional (Nice-to-have): adicionar campo extra `pareto_analise` no JSON de retorno (string curta) renderizado no rodapé do `ParetoBloco`. Se ausente, o bloco fica só com gráfico + resumo numérico.

### 6. Exportações
- `exportPptx.ts`: adicionar slide do Pareto seguindo padrão dos demais (chart + texto). Fora deste plano se você preferir manter PPTX como está — confirmar.

## Arquivos a alterar
- `src/hooks/useRelatorioExecutivoFaturamento.ts` (tipo + presets)
- `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx` (novo `ParetoBloco` + helper)
- `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx` (catálogo, payload IA, render preview)
- `supabase/functions/relatorio-executivo-ia/index.ts` (aceitar `pareto`, prompt enriquecido, opcional `pareto_analise` no JSON)

## Fora do escopo
- Alterações no FastAPI / views BI.
- Mudança de visual em outros blocos.
- Suporte a Pareto multi-dimensão simultâneo (será via tabs, uma dimensão visível por vez).

## Dúvidas (responda antes de implementar, opcional)
1. Dimensão padrão do Pareto: **Clientes** ou **Revendas**?
2. Incluir o slide Pareto no PPTX também?

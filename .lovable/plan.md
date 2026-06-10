## Objetivo
Reaproveitar a lógica do Relatório Executivo de Faturamento para gerar relatórios executivos análogos em **Passagens Aéreas**, **Manutenção de Frota** e **Manutenção de Máquinas**.

## Resposta curta
Sim, dá pra fazer. A estrutura atual (wizard de período/filtros → preview com blocos → exportação PDF/PPTX + comentários IA) é genérica o bastante para virar um template reutilizável.

## Estratégia
Extrair a parte “chassi” do relatório executivo (que hoje vive em `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx` + `relatorio.css` + `RelatorioBlocos.tsx`) para um conjunto de componentes genéricos, e criar uma página de relatório específica por módulo consumindo os dados já existentes em cada dashboard.

### Componentes genéricos a criar (em `src/components/relatorio-executivo/`)
- `RelatorioWizard` — período, filtros adicionais (slots), nível de detalhe, seleção de blocos.
- `RelatorioDocument` — container `#rel-doc` com header (título, subtítulo, data), footer, e fluxo de impressão PDF já corrigido.
- `RelatorioToolbar` — botões “Editar filtros”, “Exportar PDF”, “Exportar PPTX”.
- Blocos reutilizáveis: `KpisBloco`, `EvolucaoBloco`, `RankingsBloco`, `ParetoBloco`, `ComentariosIaBloco`, `TabelaAnaliticaBloco` — recebendo dados via props tipadas (não mais acoplados a `RelatorioDados` do faturamento).
- Hook `useRelatorioIa` genérico para chamar a edge function de comentários, parametrizando o contexto.

### Por módulo (cada um vira uma página dedicada)
1. **Passagens Aéreas** (`/passagens-aereas/relatorio-executivo`)
   - KPIs: total de passagens, valor total, ticket médio, nº colaboradores, principais destinos.
   - Evolução mensal de gasto e quantidade.
   - Rankings: Top colaboradores, Top destinos, Top companhias.
   - Tabela analítica: últimas passagens.
   - Fonte: tabelas Cloud já usadas pelo `PassagensDashboard`.

2. **Manutenção de Frota** (`/manutencao-frota/relatorio-executivo`)
   - KPIs: total gasto, nº ordens, custo médio por veículo, km rodado, custo/km.
   - Evolução mensal de custo e ordens.
   - Rankings: Top veículos, Top tipos de serviço, Top fornecedores.
   - Tabela analítica: últimas ordens de manutenção.

3. **Manutenção de Máquinas** (`/manutencao-maquinas/relatorio-executivo`)
   - KPIs: custo total, nº intervenções, MTBF/MTTR (se houver), top máquina por custo.
   - Evolução mensal de custos e paradas.
   - Rankings: Top máquinas, Top tipos de falha, Top responsáveis.
   - Tabela analítica: últimas intervenções.

### Comentários IA
- Edge function `relatorio-executivo-ia` recebe hoje um payload específico de faturamento. Vou generalizar aceitando um campo `modulo` (`faturamento` | `passagens` | `frota` | `maquinas`) com prompt específico por módulo, mantendo retrocompatibilidade.

### Exportação PDF
- Mesma técnica já corrigida (mover `#rel-doc` para `body`, classe `printing-rel-doc`, fallback de restauração). Estilos `relatorio.css` viram compartilhados.

### Exportação PPTX
- Generalizar `exportPptx.ts` para receber a definição dos slides via props (título, KPIs, séries, rankings) em vez de assumir o shape de faturamento.

## Entregáveis sugeridos (em ordem)
1. Extrair chassi genérico + migrar Faturamento para usá-lo (regressão zero).
2. Generalizar edge function IA e helper PPTX.
3. Implementar Relatório Executivo de Passagens Aéreas.
4. Implementar Relatório Executivo de Manutenção de Frota.
5. Implementar Relatório Executivo de Manutenção de Máquinas.
6. Adicionar entradas no menu lateral / botões “Relatório Executivo” em cada dashboard.

## Fora de escopo
- Mudar a UI dos dashboards existentes.
- Criar novas tabelas ou ETL — vou usar as fontes de dados já existentes em cada módulo.

## Perguntas antes de começar
1. Quer que eu faça tudo de uma vez (passos 1 a 6) ou prefere ir por módulo, validando cada relatório?
2. Para **cada** módulo, os blocos sugeridos cobrem o que você precisa, ou tem KPI/ranking específico que faltou?
3. Os comentários IA devem usar o mesmo tom executivo (Destaques / Alertas / Recomendações) dos relatórios de faturamento?
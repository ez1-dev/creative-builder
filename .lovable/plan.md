## Objetivo

Adicionar dois novos gráficos no dashboard de **Passagens Aéreas** mostrando os destinos mais visitados:

1. **Top 10 Cidades de Destino** — gráfico de barras horizontais com as cidades que mais aparecem em viagens (qtd) + valor total no tooltip.
2. **Top Estados (UF) de Destino** — gráfico de barras com ranking de UFs por quantidade de viagens.

Ambos integrados ao mesmo sistema de **cross-filter** já existente (clique numa barra filtra o restante do dashboard via `selectedDestino` / `selectedUF`, que já estão implementados no estado e em `applyCross`).

## Onde

`src/components/passagens/PassagensDashboard.tsx` — adicionar dois `ChartCard` novos dentro do bloco `charts-row` (que hoje já agrupa: Evolução Mensal, Motivo, Top Centros de Custo). Vai virar um grid de 5 gráficos. Em telas grandes, layout em 2 linhas (3+2).

## Como

1. Calcular `porCidade` (top 10) e `porUF` com `useMemo`, seguindo o padrão de `porMes` / `porMotivo`:
   - `porCidade`: aplica cross-filters exceto `destino` (próprio eixo). Agrupa por `nomeNormalizado(r.destino)` mantendo o label original mais frequente. Ordena por qtd desc, limita a 10.
   - `porUF`: aplica cross-filters exceto `uf` (próprio eixo). Agrupa por `r.uf_destino` em maiúsculas, ignora vazios.
2. Renderizar com `BarChart` horizontal (`layout="vertical"`) usando `recharts`, paleta `COLORS` já no arquivo, e `formatCurrency` no tooltip.
3. Clique na barra alterna `selectedDestino` / `selectedUF` via `toggleItem` (mesmo padrão dos outros gráficos).
4. Mostrar chip "Filtro ativo" quando `selectedDestino`/`selectedUF` não vazio, com botão para limpar (igual aos demais).
5. Envolver cada card num `<VisualGate visualKey="passagens.top-cidades">` / `passagens.top-ufs` para respeitar permissões.
6. Atualizar `src/lib/visualCatalog.ts` adicionando os dois novos `visualKey`s no módulo Passagens, para aparecerem no controle de permissões por perfil.

## Layout

O `charts-row` continua sendo um único widget (não mexe na grid persistida em `dashboard_widgets`). Internamente passa de `grid-cols-3` para `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, ficando 5 cards que se acomodam em 2 linhas no desktop e empilham no mobile. A altura `h: 12` do bloco já comporta — ajustar para `h: 16` no `PASSAGENS_DEFAULT_WIDGETS` (`src/hooks/usePassagensLayout.ts`) e empurrar a tabela de `y: 22` para `y: 26`.

## Sem mudanças em

- Banco de dados (campos `destino` e `uf_destino` já existem em `passagens_aereas`).
- Backend / edge functions.
- Permissões de tela (apenas adição de 2 visual keys opcionais).

## Resultado

Usuário vê, ao lado dos gráficos atuais, dois novos rankings: cidades e estados mais visitados, clicáveis para drill-down cruzado com KPIs, mapa, motivo e CC. Mobile-friendly e respeitando o tema azul corporativo.

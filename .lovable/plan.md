## Problema

No bloco **Rankings por Dimensão** do Relatório Executivo, o gráfico e a tabela de **Top Revendas** mostram apenas traços (`—`) no lugar dos nomes. Isso acontece tanto no preview da tela quanto no PDF (já que o PDF imprime o mesmo DOM).

Causa raiz: o endpoint `GET /api/bi/comercial/revenda` retorna apenas o código da revenda (`revenda: string`), sem `nm_revenda` nem `revenda_label`. O helper `pickDimensionLabel('revenda', row)` então só consegue devolver o código — e nas linhas em que o código está vazio/nulo, devolve `''`, virando `'—'` na UI.

O catálogo de nomes já existe no Lovable Cloud na tabela `bi_revenda` (`cd_rev_pedido` + `nm_revenda`), populada pela rotina `revendas/sincronizar`. A correção mais segura e sem mexer no backend é enriquecer os rankings client-side usando esse catálogo.

## Escopo

Apenas o bloco **Rankings por Dimensão** (`RankingsBloco` em `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx`) e o hook que alimenta o relatório. Nada de mudanças no backend FastAPI, no PDF/CSS, em outras páginas do BI nem no Pareto.

## Mudanças

1. **Novo hook `useRevendaCatalog`** (em `src/lib/bi/revendaCatalog.ts`):
   - Faz `supabase.from('bi_revenda').select('cd_rev_pedido,nm_revenda')` uma vez (cache via React Query, `staleTime` longo).
   - Retorna um `Map<string, string>` de `cd_rev_pedido → nm_revenda`.

2. **`useRelatorioExecutivoFaturamento`**:
   - Consome `useRevendaCatalog` e enriquece `dados.rankings.revenda`, adicionando em cada linha `nm_revenda` e `revenda_label = "<cd> - <nm>"` quando houver match. Linhas sem match permanecem com o código.

3. **`RankingsBloco` / `RankingTopN`**:
   - Continua usando `pickDimensionLabel(row, 'revenda')` — que já lê `revenda_label` e `nm_revenda` automaticamente, então passa a exibir o nome correto no eixo Y do gráfico e na coluna "Revendas" da tabela.
   - Pequenos ajustes de UX: aumentar `YAxis width` no `RankingTopN` para caber rótulos como `123456 - REVENDA SP CENTRO` sem cortar (e truncar com `…` quando passar de N caracteres).

4. **Top Obras**: verificar se o endpoint já manda `projeto` (nome). Se sim, nada a fazer (o `pickDimensionLabel('obra')` já cobre). Caso `projeto` venha vazio, fallback continua mostrando o código `cd_prj`. Sem mudanças adicionais.

5. **Top Estados**: já funciona via `formatEstadoLabel(cd_estado)`. Sem mudanças.

## Out of scope

- Backend FastAPI (não vamos pedir para adicionar `nm_revenda` no endpoint).
- Estilos de impressão / `relatorio.css` (a correção é puramente de dados; PDF herda automaticamente).
- Outros blocos do relatório (KPIs, Evolução, Pareto, Margem, Tabela Analítica, Comentários IA).
- Outras páginas do BI que consomem o mesmo endpoint.

## Como validar

1. Abrir `/bi/comercial/relatorio-executivo`, gerar relatório com período padrão.
2. No bloco "Rankings por Dimensão → Top Revendas", o eixo Y do gráfico e a coluna "Revendas" da tabela devem mostrar `código - NOME DA REVENDA` (ou só o nome quando o código não existir).
3. Clicar em "Imprimir / PDF" e conferir que o mesmo aparece no PDF exportado.

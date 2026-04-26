## Problema

No Painel de Compras, os gráficos **"Top Famílias por Valor Líquido"** e **"Top Origens por Valor Líquido"** estão exibindo apenas uma única barra **"Sem família"** / **"Sem origem"**, agregando todo o valor em um único bucket.

## Causa raiz

O agrupamento dos gráficos no `chartData` (e o `useErpOptions` que alimenta os comboboxes de filtro) lê campos que **não existem** na resposta real da API `/api/painel-compras`:

| Código atual lê       | Campo real na resposta |
|-----------------------|------------------------|
| `d.familia_item`      | `d.codigo_familia`     |
| `d.origem_item`       | `d.origem_material`    |

Como ambos resolvem para `undefined`, o fallback `'Sem família'` / `'Sem origem'` é sempre usado, o que gera as barras únicas observadas. Confirmado inspecionando a resposta real da API (campos `codigo_familia: "TINTAS"`, `origem_material: "88"`).

## Alterações

### `src/pages/PainelComprasPage.tsx`

1. **Linha 69** — corrigir as keys passadas para `useErpOptions`:
   ```ts
   useErpOptions(erpReady, data?.dados, { 
     familiaKey: 'codigo_familia', 
     origemKey: 'origem_material' 
   })
   ```
   Isso também conserta as opções dos filtros de Família e Origem do material.

2. **Linha 228** — usar `d.codigo_familia` no agrupamento de famílias.

3. **Linha 239** — usar `d.origem_material` no agrupamento de origens.

Nenhuma outra alteração (KPIs, filtros, paginação, exportação) é necessária. Os labels dos eixos (`codigo_familia`, `origem`) e a estrutura dos objetos do `chartData` permanecem iguais.

## Validação

1. Acessar `/painel-compras`, clicar **Pesquisar**.
2. Verificar que **"Top Famílias por Valor Líquido"** mostra múltiplas famílias (TINTAS, etc.) ordenadas por valor.
3. Verificar que **"Top Origens por Valor Líquido"** mostra múltiplas origens (ex.: 88, 0, ...).
4. Conferir que os comboboxes de filtro **Família** e **Origem do material** agora listam as opções corretas extraídas da resposta.

## Objetivo
Adicionar a informação **Origem da OP** na linha de cabeçalho/filtros da página Reserva Nº de Série, junto com Pedido, Item, OP, Produto, Derivação e Nº Série Manual. Hoje a Origem da OP só aparece dentro do card "Contexto do Pedido / OP", mas o usuário precisa vê-la próxima dos outros campos identificadores.

## Contexto atual
- O backend já retorna `origem_op` no objeto `ContextoNumeroSerie` (campo carregado em `/api/numero-serie/contexto`).
- Hoje ela aparece apenas no card de contexto via `ctxField('Origem OP', contexto.origem_op)`.
- A linha de filtros tem 6 colunas (`grid-cols-6` no lg): Pedido, Item, OP, Produto, Derivação, Nº Série Manual.

## Mudanças

### 1. `src/pages/NumeroSeriePage.tsx`
- Acrescentar um campo **"Origem OP"** (read-only, somente exibição) na linha de filtros, posicionado logo após o campo **OP**.
  - Será preenchido automaticamente quando o contexto for carregado, lendo de `contexto.origem_op`.
  - Será limpo no `limpar()`.
- Ajustar o grid para acomodar 7 campos:
  - `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7` para manter responsividade.
- Adicionar `origem_op` ao state `filters` (string, default `''`) apenas para exibição na linha (não enviado nas chamadas).
- Atualizar `setFilters` no sucesso de `buscarContexto` para também gravar `origem_op: result.contexto?.origem_op || ''`.
- Manter o campo "Origem OP" também dentro do card de Contexto (não remover, é informação útil agrupada).

## Notas
- Sem mudanças de backend nem de banco — o campo já vem da API.
- Sem nova migração.

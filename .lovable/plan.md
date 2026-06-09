# Coluna Desconto em "Detalhamento por Nota Fiscal"

## Verificação do backend
O type `ComercialDetalheRow` em `src/lib/bi/comercialApi.ts` **não inclui** `vl_desconto` hoje, e nenhuma referência ao campo aparece no frontend para esse endpoint. Não há ambiente para chamar `/api/bi/comercial/detalhes` durante o plano para confirmar se a API já devolve a coluna, então o plano cobre os dois cenários:

- Se o backend já retornar `vl_desconto`: o frontend passa a usá-lo direto.
- Se não retornar: adicionar `COALESCE(vl_desconto, 0) AS vl_desconto` no SQL do endpoint (doc abaixo). Enquanto isso, a coluna no grid mostrará R$ 0,00.

## Mudanças no frontend

### 1. `src/lib/bi/comercialApi.ts`
Adicionar campo opcional no type:
```ts
vl_desconto?: number | null;
```
(logo após `vl_impostos`).

### 2. `src/pages/bi/ComercialPage.tsx` — `colsDetalhes`
Inserir a coluna **entre `vl_bruto` e `vl_impostos`**:
```ts
{ key:'vl_desconto', header:'Desconto', align:'right',
  render:(_v,r)=> formatCurrency(n(r.vl_desconto)) },
```
Segue o mesmo padrão das outras colunas monetárias do grid (`formatCurrency(n(...))`, `align:'right'`). Mantém compatibilidade quando o backend ainda não devolve o campo (`n(undefined) === 0`).

> Observação: as demais colunas do grid não usam `groupable`/`aggregate`/`summaryInGroupHeader` em monetárias intermediárias (só `vl_bruto`, `vl_liquido` e `qtd_produtos` aparecem com `summaryInGroupHeader`). Mantemos a coluna nova consistente com `vl_impostos` e `vl_devolucao` (sem agregação no header). O componente `DataTableBI` exporta as colunas visíveis, então a coluna entra automaticamente em CSV/Excel.

## Backend (somente se a API não devolver `vl_desconto`)

Criar `docs/backend-bi-comercial-detalhes-desconto.md` com:
- Endpoint: `GET /api/bi/comercial/detalhes`.
- Ajuste: adicionar `COALESCE(vl_desconto, 0) AS vl_desconto` ao SELECT (origem `VM_FATURAMENTO.VL_DESCONTO`, já existente — não alterar UpQuery/ERP).
- Sem mudanças em filtros, parâmetros, paginação ou shape do envelope.
- Aceite: payload de cada linha contém `vl_desconto` numérico.

## Fora de escopo
- Drill `NOTA_FISCAL`/`DETALHES_IMPOSTOS` (já listam descontos via lógica própria do drawer).
- VM_FATURAMENTO / UpQuery / ERP.
- Outros grids/módulos.

## Aceite
- Grid "Detalhamento por Nota Fiscal" mostra coluna "Desconto" entre "Vl. Bruto" e "Impostos".
- Valor formatado em moeda BR, alinhado à direita.
- CSV e Excel exportados a partir do grid incluem a nova coluna.
- Se o backend ainda não retornar `vl_desconto`, a coluna aparece zerada até o ajuste do SQL documentado.

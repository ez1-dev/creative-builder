# Pré-visualização vazia ao adicionar bloco da Biblioteca BI

## Diagnóstico

No diálogo "Adicionar bloco" → aba **Da Biblioteca BI**, a pré-visualização renderiza o componente com `ctx.series = pageSeries` da página. Hoje o `ComercialPage` só busca séries do tipo `por_<dim>__<metrica>` (Cliente, Produto, Nota Fiscal, Detalhe Impostos) sob demanda — apenas quando **algum widget já no dashboard** referencia aquela chave.

Como a série escolhida no diálogo (ex.: `por_cliente__nvendas` para o Funil) ainda **não está em uso**, ela não é buscada via drill API → `pageSeries[chave]` fica `undefined` → preview mostra "Sem dados para exibir".

As séries `mensal__*`, `anual__*`, `por_estado__*`, `por_revenda__*`, `por_obra__*`, `por_mix__*` já estão carregadas, então só as drill-backed (cliente / produto / nota_fiscal / detalhe_impostos) sofrem com isso.

## Solução

Quando o diálogo "Adicionar bloco" estiver aberto e o usuário selecionar uma série, incluir essa chave temporariamente no conjunto que dispara o fetch lazy, para que a pré-visualização use dados reais (com cache, sem refetch quando o widget for adicionado).

### Mudanças

1. **`src/components/bi/runtime/AddBiWidgetDialog.tsx`**
   - Adicionar prop `onPreviewSeriesChange?: (key: string | null) => void`.
   - Em `useEffect`, emitir `seriesKey` selecionado sempre que a aba for `library` e o componente exigir input do tipo `series`; emitir `null` ao trocar para `catalog`, ao fechar o diálogo ou quando o componente não usar séries.

2. **`src/pages/bi/ComercialPage.tsx`**
   - Novo estado `previewSeriesKey: string | null`.
   - Passar `onPreviewSeriesChange={setPreviewSeriesKey}` para `AddBiWidgetDialog`.
   - No `useMemo` que monta `referencedSeriesKeys`, incluir `previewSeriesKey` (quando não-nulo) no `Set` — o hook `useComercialDrillSeries` então buscará essa série e o cache fica disponível tanto para o preview quanto para o widget recém-adicionado.
   - Limpar `previewSeriesKey` ao fechar o diálogo (`setAddOpen(false)` callback).

### Fora de escopo

- Aba "Catálogo BI Comercial" continua sem pré-visualização (blocos canônicos têm regras próprias de render e dependem de muitos slots).
- Outras páginas BI (Frota etc.) não usam drill series no preview — sem mudança.
- Nenhuma alteração no backend, no `componentRegistry` ou na lógica de drill.

## Resultado esperado

Ao escolher "Funil" + "Cliente · Nº Vendas" no diálogo, a pré-visualização passa a renderizar os top clientes em formato de funil enquanto o fetch lazy roda (estado de loading → dados reais), espelhando o que o bloco mostrará depois de adicionado.

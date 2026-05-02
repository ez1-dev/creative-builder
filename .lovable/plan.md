
## Bug

Após a última mudança, vários cards do Painel de Compras aparecem vazios (`-`): Total OCs, Valor Líquido, Impostos Totais, Fornecedores, Valor Pendente, OCs Atrasadas, Ticket Médio, Total Linhas, Itens Produto, Itens Serviço.

## Causa

O `useMemo` de `kpis` agora faz `if (data.totais) return data.totais;` — substitui tudo pelo objeto `totais` do backend.

O problema: o objeto `totais` que o backend manda usa um **schema diferente** do que os cards esperam. Pelo que vimos no exemplo do próprio backend (`{ qtd_registros, valor_total, ... }`), e pela imagem do usuário (só "Valor Bruto", "Itens Pendentes/Atrasados" e "Maior Atraso" aparecem — coincidentemente os campos com nomes mais comuns), o backend devolve apenas um subconjunto de campos, com nomes diferentes em alguns casos. Os cards leem `kpis.total_ocs`, `kpis.valor_liquido_total`, `kpis.impostos_totais`, etc.; quando a chave não existe em `totais`, o card fica `-`.

## Correção

Em vez de **substituir** com `data.totais`, **mesclar** os três níveis em ordem de prioridade, preservando campos ausentes:

1. `totais` (backend agregado, prioridade máxima)
2. `resumo` (legado, se ainda vier)
3. fallback client-side calculado sobre `data.dados` (para preencher os campos que `totais` não trouxe)

Também normalizar aliases conhecidos do backend (`qtd_registros` → `total_linhas`, `valor_total` → `valor_liquido_total`, `qtd_ocs` → `total_ocs`) antes do merge, para que campos com nomes diferentes ainda alimentem os cards corretos.

A função `merge` percorre as fontes na ordem e **só preenche um campo se ele ainda estiver vazio**, garantindo que `totais.valor_bruto_total` (se existir) ganhe do fallback, mas que `total_ocs` (ausente em `totais`) seja preenchido pelo fallback.

### Arquivo

`src/pages/PainelComprasPage.tsx` — substituir o `useMemo` de `kpis` (linhas 255–290).

```tsx
const kpis = useMemo(() => {
  if (!data) return null;
  const totais = (data as any)?.totais;
  const resumo = (data as any)?.resumo;

  // fallback sobre data.dados (página corrente)
  let fallback: Record<string, any> | null = null;
  if (Array.isArray(data.dados) && data.dados.length > 0) {
    // ... mesmo cálculo que existia antes
  }

  if (!totais && !resumo && !fallback) return null;

  // Aliases do backend → schema esperado pelos cards
  const totaisNorm: Record<string, any> = { ...(totais ?? {}) };
  if (totais?.qtd_registros  != null && totaisNorm.total_linhas        == null) totaisNorm.total_linhas        = totais.qtd_registros;
  if (totais?.qtd_ocs        != null && totaisNorm.total_ocs           == null) totaisNorm.total_ocs           = totais.qtd_ocs;
  if (totais?.valor_total    != null && totaisNorm.valor_liquido_total == null) totaisNorm.valor_liquido_total = totais.valor_total;

  // Merge: prioridade totais > resumo > fallback; só preenche se vazio
  const merge = (...sources: (Record<string, any> | null | undefined)[]) => {
    const out: Record<string, any> = {};
    for (const src of sources) for (const [k, v] of Object.entries(src ?? {})) {
      if (out[k] == null && v != null) out[k] = v;
    }
    return out;
  };

  return merge(totaisNorm, resumo, fallback);
}, [data]);
```

## Resultado esperado

- Quando o backend manda `totais` parciais → cards usam `totais` para os campos que existem e completam com fallback para os demais. Nada fica `-` à toa.
- Quando `totais` cobre todos os campos → fallback é ignorado naturalmente.
- Quando não há `totais` nem `resumo` → fallback toma conta (igual ao comportamento original).
- Aliases (`qtd_registros`, `valor_total`, `qtd_ocs`) passam a alimentar os cards corretos automaticamente.

Sem mudanças em backend ou em outras páginas.

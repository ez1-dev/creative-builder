
## Bug

No Painel de Compras, ao filtrar **Tipo Item** (Produto / Serviço / Todos), os KPIs e gráficos mudam com **valores errados**, porque o frontend ainda aplica uma mitigação client-side antiga sobre o array `dados` antes dos `useMemo` calcularem KPIs/gráficos no fallback.

Como o backend agora filtra `tipo_item` corretamente (segundo confirmação do usuário), essa mitigação só atrapalha: ela remove linhas do `data.dados` que o backend já filtrou, e quando o fallback de KPIs cai para somar `data.dados` (porque `totais`/`resumo` não vieram naquele momento), os números ficam descalibrados.

## Solução

Remover totalmente a mitigação client-side de `tipo_item` em `src/pages/PainelComprasPage.tsx`. Confiar no backend.

### Alterações

**Arquivo único: `src/pages/PainelComprasPage.tsx`**

1. **Remover bloco MITIGACAO_TIPO_ITEM** (linhas 120–151): apaga o `if (tipoFiltro && tipoFiltro !== 'TODOS' …)` inteiro e o `console.warn` + `toast.warning` associados. O backend já filtra; não precisamos pós-processar.

2. **Limpar a flag global** `(window as any).__avisouTipoItemBackend` se ainda for referenciada — só existe nesse bloco; sai junto.

3. **Manter** os outros tratamentos do `search()`: situacao_oc CSV, valor_min/max, coddep, etc.

### Diff conceitual

```diff
  const result = await api.get<PainelComprasResponse>('/api/painel-compras', params);

- // MITIGACAO_TIPO_ITEM: ...
- const tipoFiltro = filters.tipo_item;
- if (tipoFiltro && tipoFiltro !== 'TODOS' && Array.isArray((result as any)?.dados)) {
-   ... filtra `dados`, dispara toast ...
- }
-
  setData(result);
```

## Por que isso resolve

- Cards usam `response.totais` → `response.resumo` → fallback (já implementado).
- Sem mitigação adulterando `data.dados`, o fallback (quando usado) soma o que o backend mandou, que já está corretamente filtrado por `tipo_item`.
- A tabela mostra exatamente o que o backend devolveu — consistente com KPIs e gráficos.

## Documentação

Marcar `docs/backend-painel-compras-tipo-item.md` como **resolvido** (uma linha no topo). Sem mudanças no backend ou em outras páginas.

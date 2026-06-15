## Plano

A página `src/pages/bi/contabilidade/DrePage.tsx` já chama `bi_dre_matriz_anual_v2` sem `.select()` / `.order()` encadeados e sem nenhuma referência a `bi_dre` ou `bi_dre_matriz_anual`. Só falta um pequeno ajuste para bater exatamente com o contrato pedido (ambos parâmetros como `text`, fallback `'2026'` como string):

### Alteração única em `DrePage.tsx` (fetchDre)

De:
```ts
const { data, error } = await supabase.rpc('bi_dre_matriz_anual_v2' as any, {
  p_ano: String(ano || 2026),
  p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
});
```

Para:
```ts
const { data, error } = await supabase.rpc('bi_dre_matriz_anual_v2' as any, {
  p_ano: String(ano || '2026'),
  p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
});
```

Nada mais muda: filtros (Ano / Mês inicial / Mês final / Unidade), recorte de colunas no frontend, ordenação por `ordem` no `useMemo`, formatação BRL/percentual/negativos, sticky header/coluna, KPIs e `console.error('Erro RPC bi_dre_matriz_anual_v2:', error)` permanecem como estão.

### Observação sobre "function not found in schema cache"
Se o erro persistir após esse ajuste, o problema não está no frontend — é o PostgREST com cache de schema desatualizado. Nesse caso eu reporto e peço para recarregar o schema do backend (ou confirmar que o Lovable Cloud aponta para o mesmo projeto onde a função `bi_dre_matriz_anual_v2(text, text)` foi criada). O frontend já estará correto.

## Ajustes em `src/pages/bi/contabilidade/DrePage.tsx`

A página já usa exclusivamente `bi_dre_matriz_anual` e não encadeia `.select()` nem `.order()`. Faltam três ajustes pontuais para alinhar 100% ao contrato pedido:

### 1. `p_ano` como string
Trocar o payload da RPC:
```ts
const { data, error } = await supabase.rpc('bi_dre_matriz_anual' as any, {
  p_ano: String(ano || 2026),
  p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
});
```

### 2. Log de erro explícito
Dentro do `try/catch`, antes do `toast.error`:
```ts
if (error) {
  console.error('Erro RPC bi_dre_matriz_anual:', error);
  throw error;
}
```

### 3. Refetch automático ao trocar ano/unidade + limpeza de estado
Adicionar `useEffect` que limpa `linhasRaw` e chama `fetchDre()` sempre que `ano` ou `unidade` mudarem (hoje só dispara no clique manual em "Atualizar"):
```ts
useEffect(() => {
  setLinhasRaw([]);
  fetchDre();
}, [ano, unidade]);
```

### Confirmações (já corretos, sem mudança)
- Renderização lê `row.descricao`, `row.<mes>_realizado|_av|_orcado`, `row.total_realizado|_av|_orcado` diretamente.
- Nenhum `.select()` ou `.order()` encadeado após a RPC.
- Ordenação local por `ordem` no `useMemo` é mantida como defesa, mas não altera a ordem já vinda da RPC.
- Botão "Atualizar" continua disponível para refresh manual.

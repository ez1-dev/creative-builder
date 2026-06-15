## Plano

Reverter a chamada da RPC em `src/pages/bi/contabilidade/DrePage.tsx` de `bi_dre_matriz_anual_v2` para `bi_dre_matriz_anual`.

### Alterações em `DrePage.tsx`

1. **fetchDre** — trocar o nome da RPC:
```ts
const { data, error } = await supabase.rpc('bi_dre_matriz_anual' as any, {
  p_ano: String(ano || '2026'),
  p_unidade_negocio: unidade === 'TODOS' ? null : unidade,
});
```
Sem `.select()` / `.order()` encadeados (já está assim).

2. **console.error** — atualizar mensagem:
```ts
console.error('Erro RPC bi_dre_matriz_anual:', error);
```

3. **PageHeader.description** — atualizar referência:
`"Demonstração do Resultado em formato matriz mensal (RPC bi_dre_matriz_anual)."`

Nada mais muda. O contrato de colunas (`ordem`, `codigo_linha`, `descricao`, `<mes>_realizado/_av/_orcado`, `total_*`) é o mesmo, então filtros, recorte de meses no frontend, ordenação por `ordem`, KPIs, formatação BRL/percentual, negativos em vermelho e sticky header/coluna permanecem como estão. Não há outras referências a `bi_dre_matriz_anual_v2` ou `bi_dre` na página.

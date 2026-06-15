## Plano

Trocar a RPC usada em `src/pages/bi/contabilidade/DrePage.tsx` de `bi_dre_matriz_anual` para `bi_dre_matriz_anual_v2`. Toda a estrutura atual (filtros Ano / Mês inicial / Mês final / Unidade, recorte de colunas no frontend via `mesesVisiveis`, primeira coluna sticky, header sticky, scroll horizontal, formatação BRL / percentual / negativos em vermelho entre parênteses, ordenação por `ordem` no frontend) já está implementada como pedido e permanece inalterada.

### Mudanças pontuais em `DrePage.tsx`

1. Linha da chamada RPC:
   ```ts
   supabase.rpc('bi_dre_matriz_anual' as any, { ... })
   ```
   →
   ```ts
   supabase.rpc('bi_dre_matriz_anual_v2' as any, { ... })
   ```
   Continua sem `.select()` / `.order()` encadeados, com `p_ano: String(ano || 2026)` e `p_unidade_negocio: unidade === 'TODOS' ? null : unidade`.

2. Mensagem de erro no console:
   ```ts
   console.error('Erro RPC bi_dre_matriz_anual_v2:', error);
   ```

3. Texto do `PageHeader.description`: atualizar a referência para `bi_dre_matriz_anual_v2`.

Nenhuma outra alteração — contrato de colunas (`<mes>_realizado/_av/_orcado`, `total_*`, `descricao`, `ordem`) é o mesmo. Não há referências remanescentes a `bi_dre` ou `bi_dre_matriz_anual` no arquivo após essas trocas.

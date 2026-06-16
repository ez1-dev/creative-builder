## Correção do parâmetro `unidade` na chamada da RPC `bi_dre_matriz_anual`

### Contexto
A página `/bi/contabilidade/dre` está exibindo "Nenhum dado encontrado" mesmo quando a RPC retorna linhas no backend. A hipótese é que o `Select` de unidade esteja entregando o label `"Todos"` (ou outro valor diferente de `"TODOS"`) e a comparação `unidade === 'TODOS'` falha, fazendo a RPC ser chamada com `p_unidade_negocio = "Todos"` em vez de `NULL`.

> Observação de diagnóstico: ao executar `bi_dre_matriz_anual('2026', NULL)` via read_query as tabelas-fonte (`bi_dre_estrutura`, `bi_dre_mascara`, `bi_vm_lanc_contabil`, `bi_vm_orc_dre`) aparecem com 0 linhas — então mesmo após esta correção, se a tela continuar vazia, o próximo passo é checar a carga do ETL. Esta correção trata só o bug de parâmetro pedido pelo usuário.

### Mudanças em `src/pages/bi/contabilidade/DrePage.tsx`

1. **Normalizar o parâmetro `unidade`** dentro de `carregarDre()`:
   ```ts
   const unidadeParam =
     !unidade || String(unidade).trim().toUpperCase() === 'TODOS'
       ? null
       : unidade;

   const { data, error } = await supabase.rpc('bi_dre_matriz_anual' as any, {
     p_ano: String(ano || '2026'),
     p_unidade_negocio: unidadeParam,
   });
   ```

2. **Garantir `value="TODOS"`** no item "Todos" do `<Select>` de unidade de negócio (e revisar o `defaultValue`/estado inicial `unidade` para também ser `"TODOS"`, mantendo consistência maiúscula).

3. **Atualizar o log de diagnóstico já existente** para incluir `unidadeParam`:
   ```ts
   console.log('[DRE] Parametros RPC', {
     ano,
     unidade,
     unidadeParam,
     p_ano: String(ano || '2026'),
     p_unidade_negocio: unidadeParam,
   });
   ```
   O log "[DRE] Retorno RPC" permanece como está.

### Fora de escopo
- Não mexer no SQL/RPC.
- Não mexer no template visual da tabela nem nos KPIs.
- Não remover os logs `[DRE] ...` ainda — eles serão retirados depois que a tela confirmar exibição de dados.

### Validação após implementação
1. Abrir `/bi/contabilidade/dre`, console aberto.
2. Confirmar log `[DRE] Parametros RPC` com `unidadeParam: null` quando o select está em "Todos".
3. Confirmar log `[DRE] Retorno RPC` com `qtd > 0`.
4. Se `qtd === 0` mesmo com `unidadeParam: null`, o problema é falta de carga ETL nas tabelas-fonte (próximo ticket).

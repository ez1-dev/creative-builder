## Problema

No campo **Origem**, apenas a opção "100 - Origem 100" pode ser selecionada — as demais aparecem mas não selecionam. O console mostra "Encountered two children with the same key" no `SelectBuscavel`/cmdk.

Causa: o backend retorna `origens` com `cod_ori` repetido (a mesma origem aparece várias vezes, uma por empresa/combinação). O `SelectBuscavel` usa `opt.value` como `key` do React e como `value` do `CommandItem` do cmdk; chaves duplicadas fazem o React/cmdk colapsar itens, e o cmdk passa a casar todas as seleções com o primeiro item — efetivamente só "funciona" o primeiro `cod_ori` da lista.

## Correção (somente frontend)

### `src/components/producao/SelectBuscavel.tsx`
Deduplicar `options` por `value` antes de filtrar/renderizar, mantendo o primeiro `label`:

```ts
const unique = useMemo(() => {
  const seen = new Set<string>();
  const out: SelectOption[] = [];
  for (const o of options) {
    if (!seen.has(o.value)) { seen.add(o.value); out.push(o); }
  }
  return out;
}, [options]);
```

Usar `unique` em `selected` e `filtered`. Resolve o warning de keys duplicadas e o bug de seleção para Empresa, Origem, Estágio e Centro de Recurso de uma vez.

### Fora de escopo
- Backend / contrato da API.
- OpAutocomplete (usa `num_orp` que é único).
- Layout, tokens, validações.

## Validação
1. `/producao/impressao-op` → abrir Origem → todas as origens distintas devem aparecer uma única vez e cada uma deve selecionar corretamente.
2. Console: sem warning "two children with the same key".
3. Repetir para Empresa, Estágio, Centro de Recurso.

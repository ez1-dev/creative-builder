
## Bug

Ao escolher **"Todos"** (ou qualquer outra opção do seletor "Registros") no Painel de Compras, os KPIs e gráficos não atualizam para o conjunto novo — continuam refletindo o tamanho de página anterior.

## Causa

No `onValueChange` do `<Select>` de tamanho de página (linhas 505–514 de `src/pages/PainelComprasPage.tsx`), eu faço:

```tsx
setTamanhoPagina(novo);
if (data) search(1);
```

`setTamanhoPagina` é assíncrono — o React só aplica o novo state no próximo render. Mas `search` é um `useCallback` que captura `tamanhoPagina` no closure. Quando chamo `search(1)` na mesma linha, o callback ainda enxerga o valor **antigo** (`'100'`), então a request vai com `tamanho_pagina=100` e o backend devolve a resposta paginada — KPIs e gráficos somem só os 100 primeiros registros.

## Correção

Aceitar um override explícito no `search` e passar o novo tamanho diretamente, sem depender do state ainda não propagado.

### Mudança 1 — assinatura do `search` (linha 98)

```tsx
const search = useCallback(async (page = 1, tamanhoOverride?: typeof tamanhoPagina) => {
  // ...
  const tamanhoEfetivo = tamanhoOverride ?? tamanhoPagina;
  const tamanhoNumerico = tamanhoEfetivo === 'todos' ? 100000 : Number(tamanhoEfetivo);
  const params: any = { ...filters, pagina: page, tamanho_pagina: tamanhoNumerico };
  // resto inalterado
}, [filters, erpReady, trackSearch, tamanhoPagina]);
```

### Mudança 2 — handler do Select (linhas 507–514)

```tsx
onValueChange={(v) => {
  const novo = v as typeof tamanhoPagina;
  setTamanhoPagina(novo);
  if (novo === 'todos') {
    toast.info('Carregando todos os registros do filtro — pode levar alguns segundos para muitos resultados.');
  }
  if (data) search(1, novo); // ← passa o novo tamanho explicitamente
}}
```

Sem mudanças em backend, em outras páginas, ou no contrato de API. Apenas dois pontos pequenos no `PainelComprasPage.tsx`.

## Por que não polling

O contexto sugere "polling" como solução, mas o problema aqui não é timeout do backend — é puramente um closure stale do React. Polling adicionaria complexidade desnecessária.

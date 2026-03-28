

# Adicionar coluna "Situação" na tabela de Notas de Recebimento

## Alteração: `src/pages/NotasRecebimentoPage.tsx`

Adicionar uma nova coluna `situacao_nf` (ou o campo correspondente retornado pela API) no array `columns`, com um `render` que mapeia os códigos numéricos para labels descritivos:

```ts
{
  key: 'situacao_nf',
  header: 'Situação',
  render: (v) => {
    const map: Record<string, string> = {
      '1': 'Situação 1',
      '2': 'Situação 2',
      '3': 'Situação 3',
      '4': 'Situação 4',
      '5': 'Situação 5',
    };
    return map[String(v)] || v || '-';
  }
}
```

A coluna será posicionada após "Série" e antes de "Fornecedor" (ou outro local lógico). Quando as legendas oficiais do SITNFC estiverem disponíveis, basta atualizar o mapa.

Nenhum arquivo novo — apenas adição de um item no array `columns`.


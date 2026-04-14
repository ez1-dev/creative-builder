

# Adicionar Nº NF na Lista Detalhada do Painel de Compras

## Problema
A lista detalhada do Painel de Compras não exibe o número da nota fiscal, informação relevante especialmente quando a situação da OC é 4 (Liquidado).

## Solução
Adicionar uma coluna "Nº NF" ao `baseColumns` no `src/pages/PainelComprasPage.tsx`. O campo provavelmente já vem da API como `numero_nf` ou similar. A coluna será posicionada após "Situação".

### Alterações em `src/pages/PainelComprasPage.tsx`

1. Adicionar coluna ao array `baseColumns` (após `situacao_oc`, antes de `dias_atraso`):
```typescript
{ key: 'numero_nf', header: 'Nº NF', render: (v) => v || '-' },
```

2. Se o campo da API tiver nome diferente (ex: `numero_nota_fiscal`, `nf_entrada`), ajustar o `key` conforme o dado retornado. O render mostra `-` quando não houver NF associada.

### Resultado
A coluna "Nº NF" aparecerá na lista detalhada, exibindo o número da nota fiscal quando disponível — especialmente útil para OCs com situação 4 (Liquidado).




# Incluir telas de Produção na matriz de permissões

## Problema
O array `ALL_SCREENS` em `ConfiguracoesPage.tsx` (linha 20-31) lista apenas as telas originais e ainda referencia o caminho antigo `/engenharia-producao`. As 7 novas rotas de produção não aparecem na aba "Permissões por Tela".

## Solução
Atualizar o array `ALL_SCREENS` para:
1. Remover a entrada antiga `{ path: '/engenharia-producao', name: 'Eng. x Produção' }`
2. Adicionar as 7 novas telas de produção:

```
{ path: '/producao/dashboard',       name: 'Produção - Dashboard' },
{ path: '/producao/produzido',       name: 'Produção - Produzido no Período' },
{ path: '/producao/expedido',        name: 'Produção - Expedido para Obra' },
{ path: '/producao/patio',           name: 'Produção - Saldo em Pátio' },
{ path: '/producao/nao-carregados',  name: 'Produção - Não Carregados' },
{ path: '/producao/leadtime',        name: 'Produção - Lead Time' },
{ path: '/producao/engenharia',      name: 'Produção - Eng. x Produção' },
```

## Arquivo afetado
- `src/pages/ConfiguracoesPage.tsx` — apenas o array `ALL_SCREENS` (linhas 20-31)

Nenhuma migration necessária; as entradas em `profile_screens` já foram inseridas anteriormente.


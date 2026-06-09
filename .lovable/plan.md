# Limpar código duplicado no Nome do Cliente (Detalhes de Impostos)

## Diagnóstico

Em `src/components/bi/drill/ComercialDrillDrawer.tsx` o `stripCodePrefix` já é aplicado quando a chave da coluna é exatamente `nm_cliente`:

```ts
if (c.key === 'nm_cliente') return stripCodePrefix(r.nm_cliente ?? r.cliente_label ?? ..., r.cd_cliente);
```

O problema no drill `DETALHES_IMPOSTOS` é que o backend devolve a coluna com outra chave (provavelmente `cliente_label` ou `nome_cliente`, contendo `"4352 - ARESI COMERCIO E PECAS LTDA"`). Como não bate em `nm_cliente`, cai no `fmtCell` genérico e o código aparece duplicado.

O mesmo risco existe para produto/revenda/obra quando o backend envia somente a versão `*_label`.

## Mudança

Arquivo único: `src/components/bi/drill/ComercialDrillDrawer.tsx`

1. Criar um mapa de chaves de label → chave do código:

```ts
const LABEL_TO_CODE_KEY: Record<string, string> = {
  nm_cliente: 'cd_cliente',
  cliente_label: 'cd_cliente',
  nome_cliente: 'cd_cliente',
  nm_fantasia: 'cd_cliente',
  ds_produto: 'cd_produto',
  produto_label: 'cd_produto',
  descricao_produto: 'cd_produto',
  nm_revenda: 'cd_rev_pedido',
  revenda_label: 'cd_rev_pedido',
  ds_revenda: 'cd_rev_pedido',
  ds_obra: 'cd_prj',
  obra_label: 'cd_prj',
  nm_projeto: 'cd_prj',
};
```

2. No render genérico de cada coluna (dentro do `useMemo` que monta `columns`), antes do `fmtCell`, verificar:

```ts
const codeKey = LABEL_TO_CODE_KEY[c.key];
if (codeKey) return stripCodePrefix(r[c.key], r[codeKey]);
```

Isso preserva o tratamento atual para os ramos específicos (`nm_cliente`, `ds_produto`, etc.) e adiciona cobertura automática para as variantes que vierem do backend.

3. Garantir que `stripCodePrefix` aceite separadores `-`, `–`, `—` e `:` (já cobre `-` e `—`; adicionar `–` en-dash por segurança).

## Fora de escopo

- Backend, API, contrato de drill, filtros.
- `ComercialPage.tsx`, catálogo de drills, outros drawers.
- Remover o código `cd_cliente` da resposta — só ajuste de exibição.

## Critério de aceite

- No drawer "Detalhes de Impostos": coluna "Cliente" continua `4352`; coluna "Nome Cliente" passa a mostrar `ARESI COMERCIO E PECAS LTDA` (sem o `4352 - ` prefixado).
- Funciona independentemente da chave que o backend usar (`nm_cliente`, `cliente_label`, `nome_cliente`).
- Mesma limpeza aplicada a produto, revenda e obra quando vier `*_label` com prefixo de código.
- Sem regressão nos demais drills (CLIENTE, PRODUTO, REVENDA, NOTA_FISCAL).
- Sem React #310, sem erros de console.

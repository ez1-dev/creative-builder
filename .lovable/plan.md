## Objetivo

No drill por Cliente, exibir o nome em uma **coluna própria** ao lado do código, em vez de concatenar `código - nome` na coluna `Cliente`.

Resultado esperado:

```
Cliente | Nome do Cliente            | Linhas | Faturamento | ...
8865    | EMPRESA XYZ LTDA           | 2      | 650000      | ...
5235    | COMERCIAL ABC               | 1      | 250000      | ...
```

## Mudanças (somente frontend)

Arquivo: `src/components/bi/drill/ComercialDrillDrawer.tsx`

1. **Remover o override de célula** que concatena `cd_cliente - nm_cliente` na coluna `Cliente` (linhas 122–126). A coluna `Cliente` volta a mostrar só o código.

2. **Injetar uma coluna sintética `nm_cliente`** logo após `cd_cliente` quando `cur?.drill_type === 'CLIENTE'`:
   - `key: 'nm_cliente'`
   - `header: 'Nome do Cliente'`
   - `align: 'left'`
   - `render`: `r.nm_cliente ?? '—'`
   - Se a coluna já vier do backend em `resp.columns`, não duplicar.

3. **CSV**: `downloadDrillCsv` usa `resp.columns`. Para o CSV refletir a nova coluna, montar uma cópia da resposta com a coluna `nm_cliente` inserida (mesma regra do item 2) e passar essa cópia para `downloadDrillCsv` quando `drill_type === 'CLIENTE'`.

## Fora do escopo

- Backend: contrato já documentado em `docs/backend-bi-comercial-clientes-sincronizar.md`; idealmente o backend passa a incluir `nm_cliente` em `resp.columns` para o drill CLIENTE — quando fizer, o passo de injeção no frontend vira no-op por causa da deduplicação.
- Filtros técnicos (`filtros_drill`) e breadcrumb continuam iguais — só `cd_cliente`.
- Nenhuma mudança em REVENDA / PRODUTO.

## Critérios de aceite

- Drill Cliente mostra duas colunas: `Cliente` (código) e `Nome do Cliente`.
- CSV exporta as duas colunas.
- Clicar em "Detalhar" continua mandando apenas `cd_cliente` no próximo nível.
- Breadcrumb inalterado.

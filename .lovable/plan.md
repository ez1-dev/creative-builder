

# Corrigir KPIs para respeitar filtros de data de recebimento

## Diagnóstico

O código frontend envia corretamente os parâmetros `data_recebimento_ini` e `data_recebimento_fim` na requisição à API. Porém, os KPIs (Valor Líquido, Valor Bruto, etc.) usam os valores de `data.resumo` retornados pelo backend — e o backend provavelmente calcula o `resumo` sobre todos os registros, sem aplicar os filtros de data.

O frontend tem um fallback que calcula os KPIs a partir dos dados da página (`dados`), mas ele só é usado quando `resumo` é `undefined`. Quando o backend retorna `resumo`, os valores dele prevalecem — mesmo que estejam errados.

## Solução

### Alteração: `src/pages/NotasRecebimentoPage.tsx`

Remover a prioridade do `resumo` do backend e **sempre calcular os KPIs a partir dos dados retornados na página** (`dados`). Isso garante que os valores reflitam exatamente os registros filtrados visíveis.

```ts
// ANTES (usa resumo do backend, que pode não respeitar filtros):
const totalNfs = resumo?.total_nfs ?? new Set(...).size;
const valorLiquidoTotal = resumo?.valor_liquido_total ?? dados.reduce(...);

// DEPOIS (sempre calcula dos dados da página):
const totalNfs = new Set(dados.map(...)).size;
const valorLiquidoTotal = dados.reduce((acc, d) => acc + Number(d.valor_liquido || 0), 0);
```

Aplicar para todos os 6 KPIs: NFs, Itens, Fornecedores, Valor Líquido, Valor Bruto, Qtd. Recebida.

## Limitação

Os KPIs refletirão apenas a página atual (até 100 registros). Para totais globais precisos com filtros, o backend precisa ser corrigido para aplicar os mesmos filtros de data no cálculo do `resumo`.

## Recomendação para o backend

Garantir que a query que gera o `resumo` inclua as mesmas cláusulas `WHERE` de data:
```sql
AND E440NFC.DATENT >= :data_recebimento_ini
AND E440NFC.DATENT <= :data_recebimento_fim
```


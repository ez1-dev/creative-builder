

# Corrigir KPIs do Painel de Compras que não aparecem

## Diagnóstico
A página exibe os KPIs apenas quando `data.resumo` existe (linha 179: `{data && resumo && ...}`). Se a API retornar dados sem o campo `resumo`, os cards ficam invisíveis. A requisição GET retorna status 200, então os dados chegam — mas o `resumo` pode estar ausente ou com nome diferente na resposta.

## Solução
Tornar os KPIs resilientes: quando `data.resumo` não existir, calcular os indicadores diretamente a partir de `data.dados` (igual já fazemos em Estoque, Onde Usa e Compras/Custos). Quando `resumo` existir, usá-lo como fonte principal.

## Implementação — `src/pages/PainelComprasPage.tsx`

1. Adicionar um `useMemo` que calcula um resumo fallback a partir de `data.dados` quando `data.resumo` é `null`/`undefined`:
   - `total_ocs`: contagem distinta de `numero_oc`
   - `valor_bruto_total`: soma de `valor_bruto` ou campo equivalente
   - `valor_liquido_total`: soma de `valor_liquido`
   - `valor_desconto_total`: soma de `valor_desconto_total`
   - `total_fornecedores`: contagem distinta de `fantasia_fornecedor`
   - `valor_pendente_total`: soma de `saldo_pendente * preco_unitario`
   - `itens_pendentes`: contagem de itens com `saldo_pendente > 0`
   - `itens_atrasados`: contagem de itens com `dias_atraso > 0`
   - `total_linhas`: `dados.length`

2. Alterar a condição de renderização de `{data && resumo && (` para `{data && kpis && (` onde `kpis` é o resultado do `useMemo` que usa `data.resumo` se disponível, senão calcula do `dados`.

3. Adicionar `console.log` temporário da resposta da API na função `search` para debug (pode ser removido depois), ou melhor, registrar no log de erros quando `resumo` vier vazio.

## Arquivo afetado
- `src/pages/PainelComprasPage.tsx` — adicionar fallback de cálculo dos KPIs


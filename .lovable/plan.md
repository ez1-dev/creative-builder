

# Drill-down nos KPIs do Painel de Compras

## KPIs que já possuem drill-down
- **Total OCs** — breakdown por situação
- **Valor Líquido** — bruto / desconto / líquido
- **Itens Produto** — produtos vs serviços

## KPIs que receberão drill-down (usando `data.dados`)

### Indicadores Financeiros
1. **Valor Bruto** — top 10 fornecedores por valor bruto
2. **Desconto Total** — top 10 fornecedores com maior desconto
3. **Impostos Totais** — top 10 fornecedores por impostos
4. **Fornecedores** — top 10 fornecedores por valor líquido

### Indicadores de Pendência
5. **Valor Pendente** — top 10 fornecedores por valor pendente
6. **Itens Pendentes** — top 10 fornecedores por qtd de itens pendentes
7. **Itens Atrasados** — top 10 itens com maior atraso (OC + item + dias)
8. **OCs Atrasadas** — top 10 OCs atrasadas com maior atraso
9. **Maior Atraso** — top 5 itens com maior atraso (OC + descrição + dias)

### Contagem de Itens
10. **Total Linhas** — breakdown por tipo (produto/serviço) e por situação
11. **Itens Serviço** — espelho do drill de Itens Produto (produtos vs serviços com %)

## Implementação

### Arquivo: `src/pages/PainelComprasPage.tsx`

Criar helpers dentro do `useMemo` de `kpis` (ou em um segundo `useMemo`) que agrupam `data.dados` por fornecedor/OC e retornam arrays `{ label, value }[]`:

- `topFornByField(dados, field, top=10)` — agrupa por `fantasia_fornecedor`, soma o `field`, ordena desc, retorna top N com label=fornecedor, value=formatCurrency
- `topAtrasados(dados, top=10)` — filtra `dias_atraso > 0`, ordena desc, retorna com label=`OC {nº} - {desc}`, value=`{dias} dias`
- `topOcsAtrasadas(dados, top=10)` — agrupa por `numero_oc`, pega max `dias_atraso`, ordena desc

Adicionar prop `details` nos 11 KPICards listados acima.




# Gráficos calculados localmente no Painel de Compras

## Problema
Os gráficos do Dashboard só aparecem quando a API retorna o campo `graficos`. Se a API não enviar, o dashboard fica vazio. Os gráficos solicitados já existem na estrutura, mas precisam de fallback local calculado a partir de `data.dados`.

## Mudanças

### `src/pages/PainelComprasPage.tsx`

**Novo `useMemo` para gerar dados de gráficos localmente** quando `data.graficos` não vier da API:

1. **Top Fornecedores** — agrupar por `fantasia_fornecedor`, somar `valor_liquido`, ordenar desc, top 10
2. **Situação das OCs** — agrupar por `situacao_oc`, contar itens
3. **Produtos x Serviços** — agrupar por `tipo_item`, contar itens (já existe como "Tipos de Item")
4. **Top Famílias por valor líquido** — agrupar por `familia_item`, somar `valor_liquido`, ordenar desc, top 10
5. **Top Origens por valor líquido** — agrupar por `origem_item`, somar `valor_liquido`, ordenar desc, top 10
6. **Entregas por mês** — agrupar por mês de `data_entrega` (formato YYYY-MM), somar valor e contar itens

**Lógica:**
```ts
const chartData = useMemo(() => {
  if (graficos) return graficos; // API data takes priority
  if (!data?.dados?.length) return null;
  // compute all 6 chart datasets from data.dados
  return { top_fornecedores, situacoes, tipos, familias, origens, entregas_por_mes };
}, [data, graficos]);
```

**Atualizar títulos dos gráficos:**
- "Top Famílias" → "Top Famílias por Valor Líquido"
- "Origens" → "Top Origens por Valor Líquido"  
- "Entregas por Mês" → "Entregas por Mês (Itens por mês de entrega)"

**Atualizar gráfico de Origens** para usar `valor_liquido_total` em vez de `quantidade_itens` no eixo X.

**Usar `chartData` em vez de `graficos`** na renderização dos gráficos.

## Arquivo afetado
- `src/pages/PainelComprasPage.tsx`


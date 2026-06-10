## Problema
No bloco "Evolução Mensal — Realizado vs Meta" (Relatório Executivo de Faturamento), a linha vermelha tracejada "Meta" não aparece porque o componente busca as metas exclusivamente em `dados.metas` (tabela `bi_meta_faturamento` do Lovable Cloud), que está vazia / sem metas para o período. Resultado: todos os pontos do dataset ficam com `Meta: null` e o Recharts não desenha a linha.

Porém, o endpoint que alimenta `dados.mensal` (`fetchComercialMensal` → `ComercialMensalRow`) já devolve um campo `meta` por mês vindo do FastAPI/UpQuery. Esse dado não está sendo usado.

## Solução (apenas frontend)
Ajustar `EvolucaoBloco` em `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx`:

1. Ao montar o `data` do gráfico, definir `Meta` com **fallback em cascata**:
   - 1º: soma das metas cadastradas em `bi_meta_faturamento` para o `anomes_emissao` (respeitando o filtro de unidade de negócio) — comportamento atual.
   - 2º: se não houver, usar `r.meta` retornado pela própria linha de `dados.mensal` (FastAPI).
   - 3º: `null` se nenhum dos dois existir.

2. Garantir que a `<Line dataKey="Meta">` use `connectNulls` para não quebrar a linha caso algum mês fique sem meta.

3. Se **todos** os pontos forem `null`, ocultar a entrada "Meta" da legenda (passar `legendType="none"` condicional) para não confundir o usuário. Caso contrário, manter linha vermelha tracejada como hoje.

## Fora de escopo
- Não alterar API/backend nem o hook `useRelatorioExecutivoFaturamento`.
- Não mexer no cadastro de metas (`bi_meta_faturamento`) nem em outras telas.
- Não tocar nos demais blocos do relatório.

## Detalhes técnicos
Arquivo único: `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx`, função `EvolucaoBloco` (linhas ~59-92).

```tsx
const Meta = metasMap.get(r.anomes_emissao) ?? (r.meta != null ? Number(r.meta) : null);
// ...
<Line type="monotone" dataKey="Meta" stroke="hsl(var(--destructive))"
      strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
```

## Critérios de aceite
- Linha "Meta" aparece no gráfico sempre que houver meta cadastrada no Cloud **ou** meta retornada pelo FastAPI no `mensal`.
- Não gera React error #310.
- Demais linhas (Faturamento, Líquido) continuam intactas.
- Tooltip e legenda continuam formatados em R$.
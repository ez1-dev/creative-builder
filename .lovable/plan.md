## Adicionar "Tempo de Casa × Sexo" (barras agrupadas Homens/Mulheres)

Segue o mesmo padrão de `Faixa Etária × Sexo`, mas com barras **agrupadas lado a lado** (não empilhadas) como no print, usando `detalhe[]` derivado no front.

### `src/pages/rh/QuadroColaboradoresPage.tsx`

1. Novo `useMemo` `tempoCasaSexoData`:
   - Agrupa `detalhe` por `tempo_casa`, contando `homens` (sexo → M) e `mulheres` (F). Sem "outros" no gráfico (fica no filtro, se houver — ver item 3).
   - Ordena por lista canônica: `Menos de 1 ano`, `De 1 a 2 anos`, `De 2 a 3 anos`, `De 3 a 5 anos`, `De 5 a 8 anos`, `Mais de 8 anos`. Fallback: ordem alfabética pt-BR. Normalização case-insensitive/sem acento.

2. Novo `<Card>` inserido logo antes do bloco atual `Tempo de casa / Filial` (linha ~493) — mesma largura full que o card "Faixa Etária × Sexo":
   - Header `<CardTitle>Tempo de Casa × Sexo</CardTitle>`.
   - `ResponsiveContainer height={300}` com `BarChart` recharts, **sem `stackId`** (agrupado):
     - `<Bar dataKey="homens" name="Homens" fill="hsl(var(--muted-foreground))" fillOpacity={0.75}>` com `<LabelList position="top">` mostrando valor.
     - `<Bar dataKey="mulheres" name="Mulheres" fill="hsl(var(--warning))">` com `<LabelList position="top">`.
   - Ambas as barras com `cursor: pointer` e `onClick` chamando `openDrill("Tempo de casa × Homens/Mulheres", "<faixa> · <sexo>", ...)` filtrando `detalhe` por `tempo_casa === faixa && sexo` correspondente.
   - Loading: `<Skeleton h-72>`. Vazio: `<p>Sem dados.</p>`.

3. Mantém o card atual `BreakdownCard "Tempo de casa"` (total, sem separar sexo) — o novo é complementar.

### Fora de escopo
- Não muda API/backend.
- Não muda o card total "Tempo de casa" nem "Faixa Etária × Sexo".
- Sem novo endpoint — tudo derivado de `detalhe`.

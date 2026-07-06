## Adicionar gráfico "Faixa Etária × Sexo" (empilhado)

Novo card ao lado dos breakdowns existentes na página Quadro Colaboradores. Dados derivados no front a partir de `dashQ.data?.detalhe[]` — sem alteração de API.

## Arquivo

### `src/pages/rh/QuadroColaboradoresPage.tsx`

1. Novo `useMemo` `faixaSexoData` que:
   - Percorre `detalhe ?? []`.
   - Normaliza `sexo` para `"HOMENS" | "MULHERES" | "OUTROS"` (M/MASC → Homens, F/FEM → Mulheres).
   - Agrupa por `faixa_etaria` (usa `"—"` quando vazio).
   - Retorna `[{ faixa, homens, mulheres, outros }]` ordenado pela ordem de idade quando reconhecível (`Até 20 Anos`, `Até 25 Anos`, …, `Mais de 60 Anos`); fallback ordem alfabética.

2. Novo componente inline / bloco na página (mesmo grid dos outros breakdowns):
   - Título: **Faixa Etária × Sexo**.
   - `ResponsiveContainer` + `BarChart` do Recharts (já usado em outros lugares do projeto).
   - Duas `<Bar>` empilhadas (`stackId="s"`):
     - `homens` → `hsl(var(--muted-foreground))` com opacidade ~0.7
     - `mulheres` → `hsl(var(--warning))` (ou `--primary` se contrast melhor no tema atual)
   - `<XAxis dataKey="faixa" />`, `<YAxis />`, `<Tooltip />`, `<Legend />`.
   - `<LabelList position="center">` em cada barra para o número dentro do segmento; `<LabelList dataKey="total" position="top">` para o total (calculado no `useMemo`).
   - `cursor: pointer` na barra; onClick abre o drill existente (`openDrill`) filtrando `detalhe` por `faixa_etaria === faixa && sexoMatches(sexoSerie)`.
   - Estado de loading: `Skeleton h-72` quando `dashQ.isLoading`.
   - Empty state: "Sem dados" quando array vazio.

3. Ajuste de grid: encaixar o novo card no mesmo `<div>` grid dos breakdowns (Sexo, Escolaridade, Faixa etária, Tempo de casa…). Manter responsivo (mesmas classes atuais).

## Fora do escopo
- Repaginar visual do Histórico (usuário optou por manter).
- Alterar API / tipos.
- Novos endpoints ou pedidos ao backend.
- Modais/drill novos (reaproveita `openDrill`).

## Verificação
Após aplicar: abrir `/rh/quadro-colaboradores`, conferir que os totais somam com o card "Faixa etária" existente e que clicar em um segmento abre o drill filtrado por faixa+sexo.

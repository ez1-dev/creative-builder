
# Resumo Folha — Dashboard estilo painel anexado

Reestruturar `src/pages/rh/ResumoFolhaPage.tsx` para reproduzir o layout do print, mantendo o consumo único de `GET /api/rh/resumo-folha` (linhas por evento). Todas as agregações são calculadas no frontend a partir das linhas retornadas.

## 1. KPIs do topo (3 linhas × cards)

Bloco "Líquido" (card duplo grande à esquerda):
- Provento (Σ `provento`)
- Desconto (Σ `desconto`)
- Total Líquido (Provento − Desconto)

Cards à direita:
- **Custo Total** (destaque vermelho) = Provento + encargos patronais (INSS patronal + FGTS + Provisões)
- **Benefícios** = Σ eventos de benefício
- **INSS Total** = Σ eventos INSS (empregado + patronal)
- **Hora Extra** = Σ eventos de hora extra
- **Provisões** = Σ eventos de provisão (férias + 13º + encargos)
- **Custo das Férias** = Σ eventos de férias
- **Rescisões** = Σ eventos de rescisão / aviso indenizado
- **FGTS** = Σ eventos FGTS

## 2. Classificação de eventos

Como o endpoint retorna `evento`, `descricao_evento` e `tipo_evento`, criar `src/lib/rh/eventoBuckets.ts` com função `classifyEvento(row)` que devolve uma das categorias acima usando heurística por **prefixo do código** + **regex na descrição** (case-insensitive):
- Hora extra → descrição contém "HORA EXTRA"/"H.EXTRA"
- Férias → "FERIAS", "FÉRIAS", "1/3 FERIAS"
- Rescisão → "AVISO", "RESCIS", "IND.TERM", "IND.TÉRM"
- INSS → "INSS"
- FGTS → "FGTS"
- Benefícios → "VR", "VT", "VALE", "PLANO", "PLR", "AUX"
- Provisões → "PROVIS"

Mapas serão exportados (configuráveis) para fácil ajuste futuro. Cada linha pode contribuir para 1+ buckets (ex.: hora extra que também é provento conta em ambos).

## 3. Gráficos

Recharts BarChart simples:
- **Custo Hora Extra** mensal — barras por competência (Σ valor de eventos de hora extra por `competencia`).
- **Custo Mensal** mensal — barras por competência (Σ provento por mês).

## 4. Tabelas centrais (Top eventos)

Duas tabelas lado a lado, agrupando por `evento`+`descricao_evento`:
- **Proventos + Vantagens**: linhas onde `provento > 0`, ordenadas desc, colunas `#`, `Evento`, `Proventos (R$)` + linha de total no rodapé.
- **Descontos**: linhas onde `desconto > 0`, mesmas colunas, total no rodapé.

Limite 50 linhas com scroll interno.

## 5. Tabela por Filial

Agrupar linhas por `filial`. Colunas:
`Filial | Salário Base | Custo Total | Qtd. Horas | Custo Hora Extra | Qtd. Hora Extra | Líquido | FGTS | V.A. | INSS | Custo Férias | Provisões`

- `Salário Base` = Σ proventos de horas normais (código 1 / descrição "HORAS NORMAIS").
- `Qtd. Horas` / `Qtd. Hora Extra` = Σ `referencia` dos eventos correspondentes, formatadas como `HHHH:MM` (assumindo referência em horas decimais ou minutos — usar helper de formatação).
- Demais colunas usam os buckets do passo 2 filtrados pela filial.

## 6. Donut "Tipos de Evento"

PieChart (donut) Recharts agrupando por `tipo_evento` (Σ `valor_evento`), com legenda lateral mostrando código, valor e percentual — espelhando o estilo "01: 1.264.922 - 32%" / "OUTROS: 2.199.080 - 55%". Agrupar tipos pequenos (<2%) em "OUTROS".

## 7. Filtros (cabeçalho da página)

Manter os existentes (ano/mês inicial, final, filial, busca), aplicados antes de qualquer agregação.

## 8. Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│ Líquido (duplo)  │ Custo Total │ Benefícios │ INSS │ Hora Extra │
│                  │ Provisões   │ C. Férias  │ Res. │ FGTS       │
├──────────────────┼─────────────────────────┬───────────────────┤
│ Custo Hora Extra │ Proventos + Vantagens   │ Descontos         │
│ Custo Mensal     │ (tabela top)            │ (tabela top)      │
├──────────────────┴─────────────────────────┼───────────────────┤
│ Filial (tabela larga)                       │ Tipos de Evento  │
│                                             │ (donut)          │
└─────────────────────────────────────────────┴───────────────────┘
```

Tudo com tokens semânticos do design system (`bg-primary`, `text-destructive`, etc.) — sem cores hardcoded. O destaque vermelho do "Custo Total" usa `border-destructive`/`text-destructive` em um `KpiCard variant="danger"`.

## Arquivos

- `src/pages/rh/ResumoFolhaPage.tsx` — reescrita completa.
- `src/lib/rh/eventoBuckets.ts` — novo: classificação de eventos + helpers de agregação (`somarPor`, `agruparPor`, `formatarHoras`).
- (Nenhuma mudança em `api.ts`/`types.ts` — dados já vêm de `fetchResumoFolha`.)

## Fora de escopo

- Não criar novo endpoint backend. Se as heurísticas de classificação não baterem para algum cliente, ajustar `eventoBuckets.ts`.
- Não recriar a interatividade nativa do print (radio buttons para filtrar por evento) — pode ser feita em incremento futuro.

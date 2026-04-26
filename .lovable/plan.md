## Objetivo

Reformular o visual dos widgets do `DashboardBuilder` para seguir o padrão **Power BI** mostrado na referência: fundo claro, paleta vibrante (azul forte + laranja/roxo/rosa), KPI grande centralizado, gráficos com rótulos de dados visíveis, tipografia limpa e bordas sutis.

## Referência visual

- Barras: azul vibrante (#2E9BFF) com **rótulos de valor no topo** (ex: "R$213 Mil").
- Pizza: fatias coloridas com **rótulos externos contendo nome + valor + %** (ex: "FOLGA DE CAMPO R$136 Mil (26,11%)").
- KPI: número **muito grande** centralizado (ex: "R$520 Mil") com legenda discreta abaixo ("Soma de TOTAL").
- Tabela: linhas finas, valores alinhados à direita, linha "Total" destacada.
- Cards: fundo branco, sem sombras pesadas, borda fina cinza.

## Mudanças

### 1. `src/components/dashboard-builder/WidgetRenderer.tsx`

**Paleta nova (estilo Power BI):**
```ts
const COLORS = ['#2E9BFF', '#1F3A93', '#F58220', '#7B2CBF', '#E91E63', '#FFC107', '#00BCD4', '#10B981', '#EF4444', '#8B5CF6'];
```

**Helper de formato curto** (R$213 Mil / R$1,2 Mi) para rótulos de gráfico.

**KPI** — número grande centralizado:
```tsx
<Card className="h-full border-border/60">
  <CardContent className="h-full flex flex-col items-center justify-center p-4">
    <div className="text-4xl md:text-5xl font-bold text-foreground">{fmtShort(value)}</div>
    <div className="text-sm text-muted-foreground mt-2">{title}</div>
  </CardContent>
</Card>
```

**Bar chart** — rótulos no topo + cor primária Power BI:
```tsx
<Bar dataKey="value" fill="#2E9BFF">
  <LabelList dataKey="value" position="top" formatter={fmtShort} style={{ fontSize: 11, fill: '#374151' }} />
</Bar>
```
Remover `angle={-25}`, deixar labels horizontais.

**Pie chart** — rótulos externos com nome+valor+%:
```tsx
<Pie data={series} dataKey="value" nameKey="name" cx="50%" cy="50%"
     outerRadius="65%" labelLine
     label={({ name, value, percent }) =>
       `${name} ${fmtShort(value)} (${(percent * 100).toFixed(2)}%)`}>
```
Remover `<Legend>` (rótulos já mostram tudo).

**Line/Area** — manter mas trocar cor para `#2E9BFF`.

**Tabela** — adicionar linha "Total" no rodapé com soma da coluna `valor`, fundo destacado.

**Card wrapper** — usar `border border-border/60 shadow-sm` em vez de sombra pesada; título alinhado à esquerda em maiúsculas pequenas.

### 2. `src/components/dashboard-builder/DashboardBuilder.tsx`

Ajustar o container do grid para fundo claro neutro (`bg-muted/20`) para destacar os cards brancos, igual ao canvas do Power BI.

## Arquivos afetados

- `src/components/dashboard-builder/WidgetRenderer.tsx` (paleta, KPI, bar labels, pie labels, totais de tabela, estilo de cards)
- `src/components/dashboard-builder/DashboardBuilder.tsx` (fundo do canvas)

## Validação

Abrir `/passagens-aereas` e conferir:
- KPI grande centralizado.
- Barras com valor escrito no topo.
- Pizza com rótulos externos `NOME R$X Mil (Y%)`.
- Tabela com linha Total no rodapé.
- Visual geral claro, próximo da imagem de referência.

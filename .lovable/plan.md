## Ajustar donut do PieChartCard (não cortar e centralizar)

Problema: no modo compacto (donut sem `rich`), o raio é fixo em pixels (`outerRadius=90`, `innerRadius=55`) e `cy='45%'`, então:
- em cards pequenos as fatias encostam nas bordas superiores;
- em cards maiores o donut fica pequeno e "solto" no topo;
- o overlay do "Total / valor" fica desalinhado com o centro real do donut.

### `src/components/bi/charts/PieChartCard.tsx`
Substituir apenas o layout do modo compacto (não mexer no rich/externo que já funciona):

1. Radii responsivos:
   - `outerRadius: rich ? '58%' : '78%'`
   - `innerRadius: donut ? (rich ? '35%' : '55%') : 0`

2. Recentrar para dar espaço à legenda:
   - `cy: '46%'` (era 45%)
   - margem do `PieChart`: `{ top: 16, right: 20, bottom: 56, left: 20 }` (era top:10, bottom:70) — reduz sobra e evita clipping topo.

3. Ajustar o `insideR` (labels internos) para usar os novos percentuais (`0.78` e `0.55`).

4. Ajustar o layer `PieLabelsLayer` para usar `cyPx = ch * 0.46` (bater com o novo `cy`).

5. Overlay do centro:
   - trocar `pb-16` por posicionamento alinhado ao `cy`:
     ```tsx
     <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
          style={{ top: '46%', transform: 'translateY(-50%)' }}>
     ```
   - mantém `text-lg font-bold` no valor e `text-[10px] uppercase` no rótulo.

### Fora de escopo
- Sem mudar API pública (`centerLabel`, `centerValue`, `height`, `visualConfig`).
- Sem alterar paleta, tooltip ou legenda.
- Sem trocar o modo rich/externo.

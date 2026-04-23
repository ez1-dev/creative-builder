

## Tempos em minutos: exibir Min e Horas na Auditoria Apontamento Genius

### Diagnóstico
O backend retorna `horas_realizadas` e `total_horas_dia_operador` em **minutos** (apesar do nome). Hoje a tela trata esses valores como horas, o que:
- mostra valores absurdos (ex.: "480,00" h de um apontamento de 8h),
- inverte a lógica das regras de discrepância `> 8h`, que comparam minutos contra 8.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Helpers locais de conversão**
No topo do arquivo (após os tipos), adicionar:
```ts
const minToHours = (m: number | null | undefined) => (Number(m) || 0) / 60;
const fmtMinHoras = (m: number | null | undefined, dec = 2) => {
  const min = Number(m) || 0;
  return `${formatNumber(min, 0)} min · ${formatNumber(min / 60, dec)} h`;
};
const fmtHoras = (m: number | null | undefined, dec = 2) => `${formatNumber((Number(m) || 0) / 60, dec)} h`;
```

**2. Coluna "H. Realizadas" → renomear para "Tempo (min · h)"**
Trocar `formatNumber(n, 2)` por `fmtMinHoras(v)`. Mantém destaque vermelho para zero.

**3. Coluna "Total Dia Operador"**
Renomear para "Total Dia Op. (min · h)" e usar `fmtMinHoras(v)`.

**4. Lógica de classificação `> 8` (linhas ~450, ~582, ~592, ~670)**
Onde existe `horas > 8 || totDia > 8`, converter para horas antes:
```ts
const horasH = minToHours(row.horas_realizadas);
const totDiaH = minToHours(row.total_horas_dia_operador);
if (horasH > 8 || totDiaH > 8) localAcima8h++;
```
Aplicar nas três ocorrências (`atualizarKpisApontGenius`, `kpiDrilldowns` agregação, `rowClassName`).

**5. Drawer de detalhes da OP (tabela compacta linha ~1015–1068)**
- Cabeçalho: trocar `Horas` → `Tempo (min · h)`.
- Célula: usar `fmtMinHoras(r.horas_realizadas)`.
- `totaisApontamentosDaOp.totalHoras` passa a ser **soma em minutos**; exibir como `fmtMinHoras(totalHoras)`.
- Comparação `Number(a.horas_realizadas || 0) > 0` continua válida (min > 0 = h > 0).

**6. Drill profundo (popover + Sheet)**
- `OpAgg.total_horas` passa a representar **soma em minutos** (renomear semanticamente, sem mudar o nome do campo p/ não impactar tudo, mas comentar).
- Popover linha 1416: trocar `{op.apontamentos} apt · {formatNumber(op.total_horas, 1)}h` por `{op.apontamentos} apt · ${fmtMinHoras(op.total_horas, 1)}`.
- `StatusOpDeepSheet`: nas mini-KPIs e na coluna de horas da tabela de OPs, usar `fmtMinHoras`.
- `OpLinhasInline` (nível 3): coluna "H. Realizadas" / "Total Dia Op." passam a usar `fmtMinHoras`.
- KPI "Maior Total Dia" (drilldown `maiorTotalDia`) e card "Maior Total Dia": exibir `fmtMinHoras(...)`.

**7. KPI "Acima de 8h"**
Continua contando registros (já corrigido pela conversão em min→h no item 4). Sem mudança no número exibido.

**8. Exportação Excel**
Sem mudança no payload (continuamos enviando os mesmos filtros). A exportação é gerada pelo backend; se o backend exporta em minutos, sai em minutos. Nota: deixar TODO comentado caso o usuário peça normalização também na exportação.

### Build errors `StatusOpDrillCard` / `StatusOpDeepSheet`
Verifiquei: ambos componentes estão definidos no escopo top-level do arquivo (linhas 1342 e 1467) e os helpers `STATUS_LETRA_*` existem (linhas 58–66). Os erros são **stale** (do snapshot anterior do TS); ao rebuildar com as alterações acima eles desaparecem. Se persistirem, basta um touch/save no arquivo para invalidar o cache do `tsc --watch`.

### Comportamento resultante
- Tabela principal e drawers passam a mostrar tempos como `480 min · 8,00 h`.
- Regra "> 8h" volta a funcionar corretamente (compara horas reais).
- KPI "Acima de 8h", "Maior Total Dia" e drill-downs deixam de inflar artificialmente.

### Fora de escopo
- Mudar nomes de campos no backend.
- Reformatar exportação `.xlsx`.
- Persistir preferência de unidade.

### Resultado
Tempos exibidos em minutos **e** horas em todos os pontos da tela; lógica de discrepâncias e KPIs voltam a refletir a realidade.


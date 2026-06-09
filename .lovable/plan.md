## Objetivo

1. Garantir que **todos os CSVs de drill do BI Comercial** saiam com vírgula decimal (padrão BR), preservando datas, períodos, códigos, NFs e textos.
2. Adicionar um botão **"Excel"** (.xlsx) ao lado do botão CSV no `ComercialDrillDrawer`, exportando os mesmos dados visíveis.

Sem mudanças em backend, contrato de drill, modo Milhões ou separador de coluna.

---

## 1. `src/lib/bi/comercialDrillApi.ts` — corrigir `fmtCsvValue`

Substituir a função atual pela versão sugerida pelo usuário:

```ts
function isNumericString(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function fmtCsvValue(v: any, format?: DrillColumn['format']): string {
  if (v == null) return '';

  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v).replace('.', ',') : '';
  }

  if (format === 'currency' || format === 'number') {
    const num = Number(v);
    if (Number.isFinite(num)) return String(v).replace('.', ',');
  }

  const s = String(v);

  if (isNumericString(s)) {
    return s.replace('.', ',');
  }

  if (s.includes('"') || s.includes(';') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}
```

Regex `^-?\d+(\.\d+)?$` preserva:
- datas `2026-04-23` (tem `-` no meio)
- períodos `202601` (inteiro, vira `202601` — sem ponto, sem alteração)
- códigos `1-200001072` (tem `-` no meio)
- NFs e séries (não-numéricas puras ou inteiros sem ponto, inalteradas)

Valores como `-1343.14`, `0.35` viram `-1343,14`, `0,35`.

---

## 2. Adicionar exportação Excel (.xlsx)

### 2a. `src/lib/bi/comercialDrillApi.ts` — nova função `downloadDrillXlsx`

Usar `xlsx` (SheetJS) — checar se já está em `package.json`; caso não, adicionar `xlsx`.

```ts
import * as XLSX from 'xlsx';

export function downloadDrillXlsx(resp: DrillResponse, filename?: string) {
  const cols = resp.columns ?? [];
  const header = cols.map((c) => c.label);
  const data = (resp.rows ?? []).map((row) =>
    cols.map((c) => {
      const v = row[c.key];
      if (v == null) return '';
      if (typeof v === 'number') return Number.isFinite(v) ? v : '';
      if (c.format === 'currency' || c.format === 'number') {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return String(v);
    }),
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  // formato numérico/moeda nas colunas numéricas
  const range = XLSX.utils.decode_range(ws['!ref']!);
  cols.forEach((c, ci) => {
    if (c.format === 'currency' || c.format === 'number') {
      for (let r = 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = c.format === 'currency' ? 'R$ #,##0.00' : '#,##0.00';
        }
      }
    }
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Drill');
  XLSX.writeFile(wb, filename || `drill-${resp.drill_type.toLowerCase()}.xlsx`);
}
```

Valores numéricos vão como **número nativo** no Excel (o Excel aplica a localização do usuário — vírgula no BR), sem necessidade de replace manual.

### 2b. `src/components/bi/drill/ComercialDrillDrawer.tsx`

Adicionar botão "Excel" ao lado do botão CSV (linhas ~433–441):

```tsx
<Button
  size="sm"
  variant="outline"
  className="h-7 gap-1 text-xs"
  onClick={() => resp && downloadDrillXlsx({ ...resp, columns: displayColumns })}
  disabled={!resp || resp.rows.length === 0}
>
  <Download className="h-3.5 w-3.5" /> Excel
</Button>
```

E adicionar `downloadDrillXlsx` ao import existente de `@/lib/bi/comercialDrillApi`.

---

## Fora de escopo

- Backend, contrato `/api/bi/comercial/drill`.
- Modo "Milhões" no CSV/XLSX — exporta valor bruto.
- Outros exports do projeto (`ExportButton` continua usando endpoint do FastAPI).

## Validação

1. Drill "Detalhes de Impostos" → CSV → ICMS/IPI/PIS/COFINS/Impostos com vírgula (`-1343,14`); datas `2026-04-23`, períodos `202601`, código `1-200001072`, NFs inalterados.
2. Mesmo drill → botão "Excel" baixa `.xlsx`; abrindo no Excel, colunas monetárias são numéricas com formato `R$`, somáveis.
3. Repetir em drills CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL.

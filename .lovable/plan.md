

## Corrigir comparação "Fim < Início" para formatos heterogêneos

### Diagnóstico
A comparação atual usa `String(r.hora_final) < String(r.hora_inicial)` em 4 pontos:
- `isLinhaDiscrepante` (linha 208)
- `atualizarKpisApontGenius` (linha 258)
- `linhasDoKpi` case `fimMenorInicio` (linha 907)
- Render do `OpLinhasInline` e do drawer (linhas 1272 e 2131)

Falha quando os campos vêm em formatos diferentes:
- `"9:00"` vs `"10:00"` → `"9:00" > "10:00"` lexicograficamente (falso positivo)
- `"08:30:00"` vs `"08:30"` → diferentes mas mesmo horário
- Número (`830`, `8.5`) vs string (`"08:30"`)
- `"08h30"`, `"0830"`, espaços, `null`/`""`

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Função utilitária `horaParaMinutos(v): number | null`**

Converte qualquer formato comum em **minutos desde 00:00**, devolvendo `null` quando inválido:

```ts
function horaParaMinutos(v: any): number | null {
  if (v == null || v === '') return null;

  // Número: heurística — pode ser HHMM (830), horas decimais (8.5) ou minutos
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v >= 0 && v < 24) return Math.round(v * 60);              // horas decimais
    if (Number.isInteger(v) && v >= 0 && v <= 2359) {              // HHMM
      const h = Math.floor(v / 100), m = v % 100;
      if (h < 24 && m < 60) return h * 60 + m;
    }
    if (v >= 0 && v < 24 * 60) return Math.round(v);               // minutos
    return null;
  }

  const s = String(v).trim().toLowerCase().replace('h', ':').replace(/\s+/g, '');
  if (!s) return null;

  // "HH:MM" ou "HH:MM:SS"
  const m1 = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m1) {
    const h = +m1[1], m = +m1[2];
    if (h < 24 && m < 60) return h * 60 + m;
  }
  // "HHMM" / "HMM" sem separador
  const m2 = s.match(/^(\d{3,4})$/);
  if (m2) {
    const n = +m2[1], h = Math.floor(n / 100), m = n % 100;
    if (h < 24 && m < 60) return h * 60 + m;
  }
  // Decimal "8.5"
  const f = Number(s);
  if (Number.isFinite(f) && f >= 0 && f < 24) return Math.round(f * 60);

  return null;
}
```

**2. Função `isFimMenorInicio(row): boolean`**

Centraliza a regra. Compara somente quando ambos parseiam para um inteiro válido:

```ts
function isFimMenorInicio(row: any): boolean {
  const ini = horaParaMinutos(row?.hora_inicial);
  const fim = horaParaMinutos(row?.hora_final);
  if (ini == null || fim == null) return false;
  return fim < ini;
}
```

**3. Substituir os 4 pontos**

Trocar todas as comparações `String(r.hora_final) < String(r.hora_inicial)` por `isFimMenorInicio(r)`:
- linha 208 (`isLinhaDiscrepante`)
- linha 258 (`atualizarKpisApontGenius`)
- linha 907 (`linhasDoKpi` → `fimMenorInicio`)
- linhas 1272 e 2131 (`fimMenor` no `OpLinhasInline` e drawer)

### Fora de escopo
- Tratar fusos horários ou dia seguinte (turno noturno virando o dia) — caso futuro precise, adicionar campo de data fim.
- Alterar contrato do backend.
- Modificar o normalizador `normalizeRowApont` para já gravar minutos (manter valores originais para exibição).

### Resultado
- Badge "Fim < Início", KPI e drill-down passam a comparar **minutos numéricos**, ignorando diferenças de formato (`"9:00"` vs `"10:00"`, `"08:30:00"` vs `"08:30"`, números `830`/`8.5`, etc.).
- Falsos positivos por comparação lexicográfica desaparecem; valores inválidos ou vazios não acionam o badge.


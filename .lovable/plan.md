## Ajuste no campo "Próx. Oper." da impressão de OP

### Objetivo
Exibir código + descrição da próxima operação no layout de impressão, conforme novos campos retornados pela API.

### Mudanças

**1. `src/lib/producao/opImpressao.ts`** — Adicionar novos campos opcionais em `OpOperacao`:
- `proxima_operacao_codigo?: string`
- `proxima_operacao_descricao?: string`
- (`proxima_operacao_label` já existe)
- Manter `proxima_operacao` para compatibilidade.

**2. `src/components/producao/OpPrintSheet.tsx`** (linha 208) — Substituir:
```tsx
<div className="v">{op.proxima_operacao_label ?? op.proxima_operacao ?? '—'}</div>
```
por lógica com fallback:
```tsx
const proxLabel = (() => {
  if (op.proxima_operacao_label?.trim()) return op.proxima_operacao_label;
  const cod = op.proxima_operacao_codigo?.trim();
  const desc = op.proxima_operacao_descricao?.trim();
  if (cod && desc) return `${cod} - ${desc}`;
  if (cod) return cod;
  return '—';
})();
```
Não usar mais `op.proxima_operacao` como fonte primária (apenas tipo legado).

### Fora de escopo
- Backend / contrato da API (apenas consumir os campos novos).
- Demais campos da operação e outros layouts.
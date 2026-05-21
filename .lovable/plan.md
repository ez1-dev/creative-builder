## Objetivo
Exibir o número da OP no PDF/impressão sem zeros à esquerda, mantendo o código de barras intacto.

## Alterações

### 1. `src/lib/producao/opImpressao.ts`
Adicionar campo opcional na interface `OpCabecalho`:
- `num_orp_exibicao?: string` (vindo da API, sem zeros à esquerda)

### 2. `src/components/producao/OpPrintSheet.tsx`
Apenas a linha de exibição do campo visual "O.P.":

Antes:
```tsx
<div className="v">{cab.num_orp_formatado ?? cab.num_orp ?? '-'}</div>
```

Depois:
```tsx
<div className="v">
  {cab.num_orp_exibicao
    ?? (cab.num_orp != null ? String(cab.num_orp).replace(/^0+/, '') || '0' : '-')}
</div>
```

### Não alterar
- Geração do `codigo_barras_op` (linha 49 continua com `padStart(9, '0')` como fallback, e segue priorizando `cab.codigo_barras_op` onde já é usado).
- Nenhuma outra lógica, CSS, API ou fluxo de operações/componentes/desenhos.

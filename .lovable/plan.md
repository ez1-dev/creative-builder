## Objetivo
Destacar as linhas mais próximas a vencer (status "A VENCER 5 DIAS" e "VENCIDO") na tabela de Vencimentos, com o badge de status piscando para chamar atenção.

## Alterações

### `src/index.css`
Adicionar uma keyframe utilitária de "pulse suave" (não usar o `animate-pulse` do Tailwind que reduz opacidade para 0.5 e some — queremos brilho/atenção mantendo legibilidade):

```css
@keyframes status-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.animate-status-blink {
  animation: status-blink 1s ease-in-out infinite;
}
```

### `src/pages/rh/ContratoExperienciaPage.tsx`
- Helper `isUrgente(status)` retornando `true` para `VENCIDO` e `A VENCER 5 DIAS`.
- Na `<TableRow>`, quando urgente: aplicar `bg-destructive/5 hover:bg-destructive/10` para destacar a linha inteira sutilmente.
- No `<span>` do badge, quando urgente: adicionar `animate-status-blink` e reforçar peso (`font-semibold`).
- `A VENCER 10 DIAS` e `A VENCER` continuam como estão (sem piscar).

## Fora de escopo
- KPIs, ordenação, backend, outras telas.

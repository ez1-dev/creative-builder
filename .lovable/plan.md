## Objetivo
Intensificar o destaque e o piscar das linhas urgentes ("VENCIDO" e "A VENCER 5 DIAS") na tabela de Vencimentos.

## Alterações

### `src/index.css`
Trocar a keyframe atual por um pulse mais forte, com brilho (ring/box-shadow) além da opacidade:

```css
@keyframes status-blink {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 hsl(var(--destructive) / 0.6);
    transform: scale(1);
  }
  50% {
    opacity: 0.75;
    box-shadow: 0 0 0 6px hsl(var(--destructive) / 0);
    transform: scale(1.05);
  }
}
.animate-status-blink {
  animation: status-blink 0.9s ease-in-out infinite;
}

@keyframes row-urgent-blink {
  0%, 100% { background-color: hsl(var(--destructive) / 0.18); }
  50%      { background-color: hsl(var(--destructive) / 0.32); }
}
.animate-row-urgent {
  animation: row-urgent-blink 1.2s ease-in-out infinite;
}
```

### `src/pages/rh/ContratoExperienciaPage.tsx`
- Trocar a classe da linha urgente de `bg-destructive/5 hover:bg-destructive/10` para `animate-row-urgent` (fundo mais forte e pulsante).
- Reforçar o badge urgente: usar fundo cheio `bg-destructive text-destructive-foreground` (em vez de `/20` transparente) + `font-bold` + mantém `animate-status-blink`.

## Fora de escopo
- KPIs, ordenação, backend, outras telas.

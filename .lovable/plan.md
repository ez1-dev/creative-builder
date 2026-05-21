## Destacar Centro Rec. e Tmp Total

Aplicar a mesma caixa de destaque já usada em **Operação** e **Próx. Oper.** (classe `op-operacao-destaque`, borda + negrito + fonte maior) aos campos **Centro Rec.** e **Tmp Total**.

### Mudanças em `src/components/producao/OpPrintSheet.tsx`

**Linhas 214–215 — Centro Rec.:** adicionar classe `op-operacao-destaque`
```tsx
<div className="k op-operacao-destaque">Centro Rec.:</div>
<div className="v op-operacao-destaque">{[op.cod_cre, op.descricao_centro_recurso].filter(Boolean).join(' ') || '—'}</div>
```

**Linhas 224–225 — Tmp Total:** trocar `op-tempo-destaque` por `op-operacao-destaque`
```tsx
<div className="k op-operacao-destaque">Tmp Total:</div>
<div className="v op-operacao-destaque">{op.tmp_total_formatado || (op.tmp_total_min != null ? `${op.tmp_total_min} min` : '—')}</div>
```

### Não muda
- **Tmp Unit** continua com `op-tempo-destaque` (apenas negrito/maior, sem caixa) — usuário pediu só Tmp Total.
- Operação e Próx. Oper. permanecem como estão.
- CSS não precisa de alterações — reutiliza estilo existente.
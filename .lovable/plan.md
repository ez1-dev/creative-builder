## Ajuste de exibição Tmp Unit / Tmp Total na Impressão de OP

### Objetivo
Exibir tempos sempre em **minutos**, usando os novos campos da API, sem converter para horas.

### Mudanças

**1. `src/lib/producao/opImpressao.ts`** — adicionar campos novos no tipo `OpOperacao`:
```ts
tmp_unit_min?: number;
tmp_total_min?: number;
```
(manter `tmp_unit`, `tmp_total`, `tmp_unit_formatado`, `tmp_total_formatado` para compatibilidade)

**2. `src/components/producao/OpPrintSheet.tsx`** (linhas 222–225) — trocar fallback para usar os campos `*_min`:
```tsx
<div className="k op-tempo-destaque">Tmp Unit:</div>
<div className="v op-tempo-destaque">
  {op.tmp_unit_formatado || (op.tmp_unit_min != null ? `${op.tmp_unit_min} min` : '—')}
</div>
<div className="k op-tempo-destaque">Tmp Total:</div>
<div className="v op-tempo-destaque">
  {op.tmp_total_formatado || (op.tmp_total_min != null ? `${op.tmp_total_min} min` : '—')}
</div>
```

### Não muda
- Estilo `op-tempo-destaque` (caixa, fonte maior, negrito) já existe e é mantido — mesmo padrão do campo Operação.
- Nenhum cálculo no frontend: total vem pronto do backend (`tmp_total_min` = `tmp_unit_min` × quantidade).
- Nenhuma alteração visual além do conteúdo dos dois campos.

### Observação para backend
O endpoint `/api/producao/ordem-producao/impressao` precisa retornar `tmp_unit_min`, `tmp_total_min`, `tmp_unit_formatado` ("5 min"), `tmp_total_formatado` ("20 min") em cada item de `operacoes[]`. Posso atualizar `docs/backend-impressao-ordem-producao.md` para refletir esse contrato em minutos (substituindo a função atual que converte para horas). Confirma se devo incluir essa atualização do doc no mesmo passo?
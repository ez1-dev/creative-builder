## Problema

Ao clicar numa barra do gráfico **Faturamento mensal x Meta**, o cross-filter aplica apenas `anomes_emissao = AAAA-MM` em `filters`. Os endpoints `/api/bi/comercial/kpis` e `/api/bi/comercial/mensal` recalculam **faturamento** com esse filtro, mas o valor de **meta** (KPI agregado e linha do combo) continua refletindo o intervalo `anomes_ini..anomes_fim` original — por isso a meta não muda quando o usuário "fatia" um único mês no clique.

## Solução (frontend, escopo mínimo)

Quando o cross-filter for por **mês específico** (chave `anomes_emissao`), reduzir também a janela base para esse mês, garantindo que toda a página (KPIs, meta, linha de meta no combo, mix, estado, revenda, obras) fique no mesmo recorte temporal.

### Alterações em `src/pages/bi/ComercialPage.tsx`

1. **`onClickMensal`** (linha ~401): em vez de só chamar `applyCtxAsCrossFilter`, fazer:
   - extrair `anomes = d.anomes_emissao` (ou via `extractDrillCtx(d, 'MENSAL').anomes_emissao`);
   - se `anomes` igual ao filtro atual `anomes_ini === anomes_fim === anomes` → **toggle off**: restaurar `anomes_ini/anomes_fim` ao `draft` (período do filtro do topo) e remover o drill `anomes_emissao`;
   - caso contrário: `setBase({ anomes_ini: anomes, anomes_fim: anomes })` e `removeDrill('anomes_emissao')` (não precisa do drill — a meta passa a ser a do mês porque a janela base é o próprio mês).

2. **Chips** continuam funcionando para os demais drills; o mês selecionado aparece naturalmente no card "Período" (já que `anomes_ini = anomes_fim`).

3. Nenhuma mudança em `applyCtxAsCrossFilter`, `toggleDrill`, ou nos demais handlers (estado, revenda, mix, obra) — eles continuam usando drill key.

### Acceptance criteria

- Clicar em uma barra mensal: KPIs (Faturamento, Meta, Diferença, % Atingimento) e a linha de Meta do combo passam a refletir somente aquele mês.
- Clicar novamente na mesma barra: período volta ao intervalo original do filtro do topo.
- Demais cliques (estado, revenda, mix, obra) continuam usando o cross-filter por drill key, sem alterar a janela `anomes_ini/anomes_fim`.

## Fora de escopo

- Ajustes no backend FastAPI (não necessário com esta abordagem).
- Mudanças visuais no chart ou nos chips.

## Plano

1. **Corrigir a abertura pelo menu de contexto do card**
   - Hoje o clique esquerdo no card `Devolução` já passa `nfContext: 'DEVOLUCOES'`, o que gera `somente_devolucao: true` no payload.
   - O ponto vulnerável é o menu “Detalhar em Nota Fiscal” em cima do card: ele abre `NOTA_FISCAL` sem o contexto do KPI, então pode cair na lista completa.
   - Ajustar `ComercialPage.tsx` para que qualquer abertura de drill originada dos KPIs `devolucao` e `impostos` preserve o recorte:
     - `devolucao` → `nfContext: 'DEVOLUCOES'` → `somente_devolucao: true`
     - `impostos` → `nfContext: 'IMPOSTOS'` → `somente_impostos: true`

2. **Preservar o recorte ao navegar dentro do drawer**
   - Conferir/ajustar o stack para manter `nfContext` ao trocar de nível ou usar “Trocar drill”, evitando voltar para `TODAS` por navegação interna.

3. **Diagnóstico visível e seguro no front**
   - Manter o título/badge do drawer indicando o recorte aplicado: “somente devoluções” ou “somente impostos”.
   - Garantir que a query key já isole os caches por `somente_devolucao`/`somente_impostos`.

4. **Busca server-side no drill**
   - Se já existir campo de busca no drawer, trocar para enviar `busca` no payload do endpoint em vez de filtrar apenas a página carregada.
   - Se não existir campo de busca no drawer atual, não criar uma nova UX ampla agora; apenas preparar o contrato no `fetchComercialDrill` para aceitar `busca` quando a UI chamar.

5. **Validação**
   - Validar no preview o cenário `GENIUS`, `202601 → 202606`:
     - clique esquerdo no card `Devolução` envia `somente_devolucao: true`;
     - menu “Detalhar em Nota Fiscal” no mesmo card também envia `somente_devolucao: true`;
     - drawer exibe o título/recorte de devoluções e não abre a lista completa.


## Remover aviso de "KPIs calculados sobre a página atual"

### Mudança
Em `src/pages/AuditoriaApontamentoGeniusPage.tsx`, remover o bloco `<Alert>` que renderiza a mensagem `KPIs de discrepância calculados sobre a página atual ...` quando `discrepanciasParciais === true`.

- Localizar o JSX do alerta (logo acima/abaixo do grid de KPIs principais) e excluí-lo.
- Manter a variável `discrepanciasParciais` se ainda for usada por outros pontos (ex.: aviso dentro do `StatusOpDeepSheet`); caso não seja mais referenciada em lugar nenhum, remover também a declaração para evitar warning de variável não usada.
- Não alterar lógica de cálculo dos KPIs nem do fallback local.

### Fora de escopo
- Mudar cálculo dos KPIs.
- Remover o aviso equivalente dentro do drill-down (continua útil naquele contexto, a menos que solicitado).

### Resultado
A faixa de alerta amarela some da tela `/auditoria-apontamento-genius`; KPIs continuam sendo exibidos normalmente.


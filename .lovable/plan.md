## Estado atual

Os itens 1 e 2 e a maior parte do 3 já estão implementados (V.A. removido, card **INSS Patronal** com tooltip, 7 agrupamentos com `limite=5000` nos níveis profundos, layout analítico com Colaborador · Evento · Qtd. referência · Valor, aviso de truncamento).

Faltam **dois ajustes finos** do item 3 (parte "TIMEOUT do drill"):

## Mudanças

1. **`src/lib/rh/api.ts` — `fetchResumoFolhaDrill`**: passar `timeoutMs: 30_000` no `api.get(...)` para cobrir o ~4s da 1ª chamada de períodos longos sem cortar a request no timeout padrão.

2. **`src/components/rh/ResumoFolhaDrillDrawer.tsx` — estado de erro**: substituir a linha de texto vermelho por um bloco com ícone + mensagem "Não foi possível carregar o drill" + botão **"Tentar novamente"** que dispara `query.refetch()`. Tratar `isTimeout`/`CLIENT_TIMEOUT` com mensagem específica ("A consulta demorou mais que 30s — tente de novo; o backend faz cache de 90s, então a segunda chamada é instantânea."). Skeleton continua durante `isLoading`; nunca skeleton infinito.

Sem mudanças em outros consumidores, tipos ou endpoints.
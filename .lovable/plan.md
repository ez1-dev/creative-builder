## Painel de Compras — `situacao_oc` multi (resolvido)

Backend passou a aceitar CSV (`situacao_oc=1,2,3`). Frontend agora envia o
CSV em `search` e `exportParams` e a mitigação client-side
(`MITIGACAO_SITUACAO_OC_MULTI`) e o `toast.info` do export foram removidos.

Ver `docs/backend-painel-compras-situacao-multi.md`.

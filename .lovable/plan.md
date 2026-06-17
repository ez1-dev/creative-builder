## Decisão

Não alterar a tela da DRE agora. A correção é no backend.

## Causa raiz

Matriz (`/api/bi/contabilidade/dre-matriz`) e drill (`/api/bi/contabilidade/dre-drill`) estão classificando lançamentos por regras diferentes. A matriz não está aplicando a mesma cadeia do drill (classificações > exceções > de/para conta+centro exato > de/para "TODAS" > `bi_dre_mascara` > `NAO_CLASSIFICADO`), o que produz totais divergentes entre tela e drill.

## Ação no backend (FastAPI / RPC)

Atualizar a RPC que alimenta `/api/bi/contabilidade/dre-matriz` para reusar exatamente a mesma função/CTE de classificação usada por `bi_dre_drill_realizado`:

1. Extrair a lógica de classificação por lançamento em uma única função SQL reutilizável (ex.: `bi_dre_classificar_lancamento(...)` retornando `cd_mascara_dre`).
2. Tanto a matriz quanto o drill devem chamar essa função — nenhuma duplicação de regras.
3. Garantir a ordem de prioridade canônica:
   - `bi_dre_classificacoes` (lançamento específico aprovado)
   - `bi_dre_excecoes` (lançamento específico)
   - `bi_dre_depara_conta_ccu` com `cd_conta_contabil` + `cd_centro_custos` exato
   - `bi_dre_depara_conta_ccu` com `cd_centro_custos = 'TODAS'`
   - `bi_dre_mascara` (regra por máscara de conta)
   - fallback `NAO_CLASSIFICADO`
4. Após atualizar a RPC: `NOTIFY pgrst, 'reload schema';`

## Ação no frontend (Lovable)

Nenhuma alteração de código. Após o deploy do backend, `DrePage` apenas chama de novo `GET /api/bi/contabilidade/dre-matriz` (o botão "Atualizar" já existente faz isso). Quando a matriz e o drill bater, a divergência some.

## Documentação

Adicionar nota em `docs/backend-bi-contabilidade-dre-matriz.md` deixando explícito:

> A matriz DRE DEVE usar a mesma função de classificação de lançamento que a RPC `bi_dre_drill_realizado`. Qualquer mudança na cadeia de prioridade precisa refletir nos dois endpoints ao mesmo tempo.

## Fora de escopo

- Não mexer em `DrePage.tsx`, `DreDrillDrawer.tsx`, hooks, ou contratos do frontend.
- Não criar migrações no Lovable Cloud (a RPC fica no Postgres do FastAPI, não no Cloud).

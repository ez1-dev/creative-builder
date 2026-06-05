---
name: Drill BI Comercial
description: POST /api/bi/comercial/drill multinível (ACUMULADO..DETALHES_IMPOSTOS); usa public.bi_cliente para mostrar nome do cliente
type: feature
---
- Backend: POST /api/bi/comercial/drill (FastAPI). Não existe RPC bi_comercial_drill no Cloud — todo o drill é resolvido no FastAPI contra v_bi_faturamento_comercial.
- Frontend: hook useComercialDrillStack + ComercialDrillDrawer (src/components/bi/drill/).
- Pilha: ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS.
- Dimensão de clientes: tabela public.bi_cliente (cd_cliente PK, nm_cliente, nm_fantasia, atualizado_em). Alimentada por POST /api/bi/comercial/clientes/sincronizar (lê E085CLI no ERP). Botão "Sincronizar clientes" no header da página /bi/comercial (admin only).
- Drill CLIENTE deve retornar cliente_label = "cd_cliente - nm_cliente" via LEFT JOIN public.bi_cliente. filtros_drill SEMPRE só { cd_cliente }.
- Contratos: docs/backend-bi-comercial-clientes-sincronizar.md (sync + JOIN) e docs/backend-bi-comercial-drill-cliente-nome.md (resumo histórico).

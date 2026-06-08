---
name: Drill BI Comercial
description: POST /api/bi/comercial/drill multinível (ACUMULADO..DETALHES_IMPOSTOS); usa public.bi_cliente e public.bi_produto para mostrar nomes
type: feature
---
- Backend: POST /api/bi/comercial/drill (FastAPI). Não existe RPC bi_comercial_drill no Cloud — todo o drill é resolvido no FastAPI contra v_bi_faturamento_comercial.
- Frontend: hook useComercialDrillStack + ComercialDrillDrawer (src/components/bi/drill/).
- Pilha: ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS.
- Dimensão de clientes: public.bi_cliente (cd_cliente PK, nm_cliente, nm_fantasia). Sync via POST /api/bi/comercial/clientes/sincronizar (E085CLI). Botão "Sincronizar clientes" no header /bi/comercial (admin).
- Dimensão de produtos: public.bi_produto (cd_produto PK, ds_produto, nm_produto). Sync via POST /api/bi/comercial/produtos/sincronizar (E075PRO). Botão "Sincronizar produtos" no header /bi/comercial (admin). Drills PRODUTO/NOTA_FISCAL/DETALHES_IMPOSTOS devem LEFT JOIN bi_produto e devolver ds_produto. Frontend injeta a coluna "Descrição do Produto" automaticamente quando backend só devolve cd_produto. filtros_drill SEMPRE só { cd_produto }.
- Drill CLIENTE: LEFT JOIN public.bi_cliente, retornar cliente_label/nm_cliente. filtros_drill SEMPRE só { cd_cliente }.
- Contratos: docs/backend-bi-comercial-clientes-sincronizar.md, docs/backend-bi-comercial-produtos-sincronizar.md, docs/backend-bi-comercial-drill-cliente-nome.md.


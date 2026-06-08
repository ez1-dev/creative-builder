---
name: Drill BI Comercial
description: POST /api/bi/comercial/drill multinível (ACUMULADO..DETALHES_IMPOSTOS); usa public.bi_cliente e JOIN direto no ERP para nome do produto
type: feature
---
- Backend: POST /api/bi/comercial/drill (FastAPI). Não existe RPC bi_comercial_drill no Cloud — todo o drill é resolvido no FastAPI contra v_bi_faturamento_comercial.
- Frontend: hook useComercialDrillStack + ComercialDrillDrawer (src/components/bi/drill/).
- Pilha: ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS.
- Dimensão de clientes: public.bi_cliente (cd_cliente PK, nm_cliente, nm_fantasia). Sync via POST /api/bi/comercial/clientes/sincronizar (E085CLI). Botão "Sincronizar clientes" no header /bi/comercial (admin).
- Nome do produto: NÃO existe bi_produto nem rota de sync. Drills PRODUTO/NOTA_FISCAL/DETALHES_IMPOSTOS devem LEFT JOIN E075PRO direto no ERP (CODPRO→ds_produto/DESPRO, NOMRED→nm_produto) e devolver ds_produto. Frontend injeta a coluna "Descrição do Produto" automaticamente quando backend só devolve cd_produto. filtros_drill SEMPRE só { cd_produto }. Spec: docs/backend-bi-comercial-produto-nome.md.
- Drill CLIENTE: LEFT JOIN public.bi_cliente, retornar cliente_label/nm_cliente. filtros_drill SEMPRE só { cd_cliente }.
- Contratos: docs/backend-bi-comercial-clientes-sincronizar.md, docs/backend-bi-comercial-produto-nome.md, docs/backend-bi-comercial-drill-cliente-nome.md.

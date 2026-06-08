---
name: Drill BI Comercial
description: POST /api/bi/comercial/drill multinível (ACUMULADO..DETALHES_IMPOSTOS); usa dimensões public.bi_cliente e public.bi_produto no Cloud
type: feature
---
- Backend: POST /api/bi/comercial/drill (FastAPI). Não existe RPC no Cloud — todo o drill é resolvido no FastAPI contra v_bi_faturamento_comercial com LEFT JOIN nas dimensões bi_*.
- Frontend: hook useComercialDrillStack + ComercialDrillDrawer (src/components/bi/drill/).
- Pilha: ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS.
- Dimensão clientes: public.bi_cliente (cd_cliente PK, nm_cliente, nm_fantasia). Sync via POST /api/bi/comercial/clientes/sincronizar (E085CLI). Botão "Sincronizar clientes" no header /bi/comercial (admin).
- Dimensão produtos: public.bi_produto (cd_produto PK = "<CODEMP>-<CODPRO|CODSER>", ds_produto, cd_familia, cd_origem, cd_unidade_medida, tipo_item, ativo). Sync via POST /api/bi/comercial/produtos/sincronizar (E075PRO + E080SER). Botão "Sincronizar produtos" no header /bi/comercial (admin). RLS: leitura authenticated, escrita só service role.
- Drill PRODUTO/NOTA_FISCAL/DETALHES_IMPOSTOS: backend faz LEFT JOIN public.bi_produto e devolve { cd_produto, ds_produto, produto_label }. Frontend renderiza cd_produto como produto_label||cd_produto e injeta coluna "Descrição do Produto" (ds_produto) automaticamente quando ausente. filtros_drill SEMPRE só { cd_produto } — NUNCA produto_label.
- Drill CLIENTE: LEFT JOIN public.bi_cliente, retornar cliente_label/nm_cliente. filtros_drill SEMPRE só { cd_cliente }.
- Contratos: docs/backend-bi-comercial-clientes-sincronizar.md, docs/backend-bi-comercial-produtos-sincronizar.md, docs/backend-bi-comercial-produto-nome.md, docs/backend-bi-comercial-drill-cliente-nome.md.
- Interação dos gráficos em /bi/comercial: clique ESQUERDO numa série/fatia/ponto = cross-filter da página (toggleDrill em useComercialFilters — toggle: mesmo valor remove; valor novo substitui). Clique DIREITO abre `<ChartContextMenu>` (src/components/bi/runtime/ChartContextMenu.tsx) com submenu "Detalhar em…" (NEXT_DRILLS) que abre o drawer multinível, e "Limpar todos os filtros". KPIs/Resumo/Gauge continuam abrindo o drawer no clique esquerdo (não há dimensão clicada).

## Objetivo
Mostrar a descrição do produto nos drills do BI Comercial **sem sincronização manual**. O nome vem direto do ERP a cada chamada de `/api/bi/comercial/drill`, eliminando o botão "Sincronizar produtos" e a tabela `bi_produto` no Cloud.

## 1. Frontend

### `src/pages/bi/ComercialPage.tsx`
- Remover o botão **"Sincronizar produtos"** e o estado/handler `syncingProdutos` / `handleSyncProdutos`.
- Manter o "Sincronizar clientes" como está (clientes seguem com dimensão própria no Cloud — mais volumoso e usado em filtros).

### `src/components/bi/drill/ComercialDrillDrawer.tsx`
- Manter a coluna virtual "Descrição do Produto" injetada quando o backend devolve `cd_produto` sem `ds_produto`/`nm_produto`. Nada muda aqui — o drawer continua tolerante caso o backend ainda não tenha implementado.

## 2. Banco (Lovable Cloud)
- **Dropar** `public.bi_produto` (sem uso depois desta mudança). Migração:
  ```sql
  DROP TABLE IF EXISTS public.bi_produto;
  ```

## 3. Contrato backend (FastAPI) — atualizar docs

Substituir `docs/backend-bi-comercial-produtos-sincronizar.md` por `docs/backend-bi-comercial-produto-nome.md`:

- **Sem** rota `/api/bi/comercial/produtos/sincronizar`.
- **Sem** dependência de tabela no Cloud.
- Em `POST /api/bi/comercial/drill`, drills `PRODUTO`, `NOTA_FISCAL`, `DETALHES_IMPOSTOS` devem fazer JOIN direto no ERP Senior:
  ```sql
  LEFT JOIN E075PRO p ON p.CODPRO = f.cd_produto
  ```
  e devolver `ds_produto` (de `DESPRO`) e opcionalmente `nm_produto` (`NOMRED`) na resposta `columns` + cada `row`.
- `filtros_drill` continua **somente** `{ cd_produto }`.
- Performance: como o drill já pagina (page_size ~100), o JOIN é barato. Se necessário, backend pode manter um cache em memória do mapa `CODPRO → DESPRO` por N minutos — detalhe interno, não muda contrato.

## 4. Memória
Atualizar `mem://features/drill-bi-comercial.md`:
- Remover dimensão `bi_produto` (tabela dropada, sem botão de sync).
- Substituir por: "Nome do produto vem direto do ERP via JOIN no FastAPI (E075PRO.CODPRO → DESPRO). Frontend injeta coluna virtual quando backend ainda não devolve ds_produto."

## Critério de aceite
- Não existe mais botão "Sincronizar produtos" em `/bi/comercial`.
- Tabela `public.bi_produto` removida do Cloud.
- Drills PRODUTO/NOTA_FISCAL/DETALHES_IMPOSTOS exibem "Descrição do Produto" assim que o backend implementar o JOIN no ERP — sem nenhuma sync prévia necessária.
- `filtros_drill` continua só com `cd_produto`.
- Drill de clientes e demais drills permanecem inalterados.

## Fora de escopo
- Implementação da consulta no FastAPI (só contrato).
- Mudança no fluxo de clientes (`bi_cliente` permanece, pois é usado também em filtros/labels fora de drill).

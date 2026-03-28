

# Adicionar dropdowns Tipo Item e Tipo OC no Painel de Compras

## Situação atual
Os campos `tipo_item` e `tipo_oc` já existem no estado `filters` (linha 47) com valor default `'TODOS'` e já são enviados à API. Porém não há campos visuais no painel de filtros para eles.

## Mudanças em `src/pages/PainelComprasPage.tsx`

### Adicionar dois Select dropdowns no FilterPanel (após linha 124, antes do checkbox)

**Tipo Item** — baseado nos dados retornados pela API (`PRODUTO`, `SERVIÇO`):
- `TODOS` → Todos
- `PRODUTO` → Produto
- `SERVICO` → Serviço

**Tipo OC** — baseado nos dados da API (`MISTA`, `NORMAL`, etc.):
- `TODOS` → Todos
- `NORMAL` → Normal
- `MISTA` → Mista

### Lógica de envio
Já funciona automaticamente — o `api.get` ignora valores vazios, e `TODOS` é enviado como parâmetro (o backend já aceita).

Nenhuma outra mudança necessária.


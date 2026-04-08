

# Adicionar filtro "Código Produto" no Painel de Compras

## O que muda
Um novo campo de filtro **"Código Produto"** será adicionado ao painel de filtros da página Painel de Compras, permitindo buscar ordens de compra pelo código do produto específico.

## Implementação

### Arquivo: `src/pages/PainelComprasPage.tsx`
1. Adicionar `codigo_produto: ''` ao estado inicial de filtros
2. Adicionar o campo no `clearFilters`
3. Adicionar um `<Input>` com label "Código Produto" no `FilterPanel`, junto aos demais filtros
4. O parâmetro `codigo_produto` será enviado na chamada à API `/api/painel-compras`

O campo ficará posicionado logo após o filtro "Item" existente, mantendo o mesmo estilo compacto (`h-8 text-xs`).


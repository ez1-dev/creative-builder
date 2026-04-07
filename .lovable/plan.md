

# Fixar colunas ao rolar horizontalmente na DataTable

## Situação atual
O build está passando sem erros (o erro anterior foi transitório). A questão principal é: ao rolar a tabela horizontalmente, as primeiras colunas (Código, Descrição, Família) devem ficar fixas/congeladas.

## Alterações

### 1. `src/components/erp/DataTable.tsx` — Suporte a colunas fixas (sticky)

Adicionar propriedade `sticky` na interface `Column<T>`:
- `sticky?: boolean` — marca a coluna como fixa à esquerda

Para cada coluna com `sticky: true`:
- Aplicar `position: sticky`, `left: <offset calculado>`, `z-index: 20`, `bg-background` no `<th>` e `<td>`
- Calcular o offset `left` acumulado com base na largura estimada das colunas anteriores com sticky
- Adicionar sombra sutil na borda direita da última coluna sticky para separação visual

### 2. `src/pages/EstoquePage.tsx` — Marcar colunas fixas

Adicionar `sticky: true` nas colunas:
- `codigo` (Código)
- `descricao` (Descrição)
- `familia` (Família)

### 3. Aplicar o mesmo padrão nas demais páginas (opcional)

As outras páginas (ComprasProdutoPage, ConciliacaoEdocsPage, etc.) podem usar a mesma propriedade `sticky` conforme necessário.

## Detalhes técnicos

A implementação usa `position: sticky` com `left` calculado. Cada coluna sticky precisa de um `left` acumulado (soma das larguras das colunas sticky anteriores). Usaremos `min-w-[Xpx]` fixo nas colunas sticky para garantir cálculo correto do offset. O background precisa ser opaco para não sobrepor conteúdo transparente.


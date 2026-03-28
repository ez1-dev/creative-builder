

# Expandir/Colapsar níveis na árvore BOM

## Abordagem
Os dados BOM vêm como lista plana ordenada hierarquicamente. Um item no nível N é "pai" dos itens consecutivos com nível > N que o seguem. A lógica de expand/collapse filtra visualmente os filhos de nós colapsados.

## Mudanças

### `src/pages/BomPage.tsx`
- Adicionar estado `collapsedRows: Set<number>` (índices dos itens colapsados no array original)
- Criar função `getVisibleRows()` que percorre `data.dados` e oculta filhos de nós colapsados:
  - Quando um item no índice `i` está no Set, pular todos os itens seguintes com `nivel` maior que o dele
- Na coluna Descrição, para itens com `possui_filhos`:
  - Adicionar ícone clicável `ChevronRight` (colapsado) ou `ChevronDown` (expandido)
  - onClick alterna o índice no Set
- Adicionar botões globais "Expandir Tudo" / "Colapsar Tudo" no header da página
- As `columns` deixam de ser constante estática e passam a ser geradas dentro do componente (para acessar o estado de collapse e o handler de toggle)

### Lógica de visibilidade
```text
Para cada item em data.dados:
  Se skip_until_level está definido e item.nivel > skip_until_level:
    → ocultar (é filho de nó colapsado)
  Senão:
    → limpar skip_until_level
    → mostrar item
    Se item está colapsado:
      → definir skip_until_level = item.nivel
```

### Ícones visuais
- `ChevronRight` → nó colapsado (clique para expandir)
- `ChevronDown` → nó expandido (clique para colapsar)
- Itens sem filhos não mostram chevron




# Fixar cabeçalho da tabela ao rolar verticalmente

## Problema
O componente `Table` (em `table.tsx`) envolve a `<table>` dentro de um `<div>` com `overflow-auto`. Isso cria **dois containers de scroll aninhados**: o `div.max-h-[60vh].overflow-auto` do DataTable e o div interno do Table. O `sticky top-0` no `<thead>` não funciona porque o scroll real acontece no div externo, mas o thead está preso ao div interno que não tem altura limitada.

## Solução

### 1. `src/components/erp/DataTable.tsx`
- Remover o wrapper `<div className="overflow-auto">` que o componente `Table` adiciona internamente, passando a table diretamente
- Alternativa mais limpa: usar `<table>` diretamente no div com `max-h-[60vh] overflow-auto`, sem o componente `Table` (que adiciona o wrapper problemático)
- Ou: mover o `overflow-auto max-h-[60vh]` para ser controlado pelo próprio DataTable sem o div intermediário do Table

**Abordagem escolhida**: No DataTable, substituir `<Table>` por uma `<table>` direta dentro do div com scroll, eliminando o wrapper duplo. Manter `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` normalmente (esses não adicionam wrappers extras).

### 2. Resultado
- O cabeçalho (Código, Descrição, Família, etc.) ficará fixo no topo ao rolar verticalmente
- As colunas sticky continuarão funcionando horizontalmente
- O cabeçalho de colunas sticky terá `z-index: 30` (acima do header normal com `z-index: 10`)

## Detalhe técnico
O `position: sticky` só funciona em relação ao **ancestor scroll container mais próximo**. Com dois divs `overflow-auto` aninhados, o sticky se ancora ao div interno (sem altura limitada), tornando-o ineficaz.


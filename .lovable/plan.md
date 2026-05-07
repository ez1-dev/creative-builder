## Remover coluna "Projeto / Obra" da tabela

Em `src/components/passagens/PassagensDashboard.tsx`:

1. Linha 1045: ajustar `baseCols` de `11/12` para `10/11`.
2. Linha 1043–1044: atualizar comentário das colunas.
3. Linha 1057: remover `<TableHead>Projeto / Obra</TableHead>`.
4. Linha 1097: remover `<TableCell>{r.projeto_obra ?? '-'}</TableCell>` (linhas agrupadas).
5. Linha 1124: remover `<TableCell>{r.projeto_obra ?? '-'}</TableCell>` (linhas normais).

Campo permanece no banco, formulário, agrupamentos (GroupBy) e exportações CSV/XLSX — apenas some da tabela exibida.

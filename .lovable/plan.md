## Remover coluna "Fornecedor" da tabela de Passagens

Em `src/components/passagens/PassagensDashboard.tsx`:

1. Linha 1045: ajustar `baseCols` de `10/11` para `9/10`.
2. Linhas 1043–1044: atualizar comentário.
3. Linha 1058: remover `<TableHead>Fornecedor</TableHead>`.
4. Linha 1097: remover `<TableCell>{r.fornecedor ?? '-'}</TableCell>` (linhas agrupadas).
5. Linha 1124: remover `<TableCell>{r.fornecedor ?? '-'}</TableCell>` (linhas normais).

Campo permanece no banco, formulário e exportações — apenas some da tabela exibida.

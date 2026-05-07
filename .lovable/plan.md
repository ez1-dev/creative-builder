## Remover colunas da lista de registros

No arquivo `src/components/passagens/PassagensDashboard.tsx`, remover da tabela as colunas:
- Nº Bilhete (`numero_bilhete`)
- Localizador (`localizador`)
- Data Volta (`data_volta`)
- Tipo (`tipo_despesa`)

### Alterações

1. **Cabeçalho (linhas 1060–1068)**: remover os 4 `<TableHead>` correspondentes.
2. **Linha agrupada por colaborador (1104–1112)**: remover as 4 `<TableCell>` correspondentes.
3. **Linha normal (1135–1143)**: remover as 4 `<TableCell>` correspondentes.
4. **Contagem de colunas (linha 1045)**: ajustar `baseCols` de `15/16` para `11/12` (4 a menos).
5. Comentário (1043–1044) atualizado para refletir as colunas restantes.

Observações:
- Os campos continuam existindo no banco, no formulário de cadastro/edição, no agrupamento e nas exportações CSV/XLSX — só somem da exibição da tabela principal.
- Filtro "Tipo" no topo é mantido (apenas a coluna some da tabela). Se preferir remover o filtro também, me avise.

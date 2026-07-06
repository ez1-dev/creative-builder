## Objetivo
No dashboard `/frota`, quando o filtro **Categoria** estiver sem nenhuma opção marcada, o dashboard deve ficar vazio (sem KPIs, gráficos ou tabelas), em vez de exibir todas as categorias.

## Mudanças

**Arquivo:** `src/components/frota/FrotaDashboard.tsx`

1. Detectar estado "nenhuma categoria selecionada" no filtro de categoria.
2. Quando esse estado ocorrer:
   - Pular o processamento/filtragem dos dados (retornar dataset vazio).
   - Renderizar um placeholder discreto no lugar do grid de gráficos/KPIs, ex.: texto centralizado "Selecione ao menos uma categoria para visualizar os dados."
3. Demais filtros (Segmento, período, etc.) continuam funcionando normalmente; a barra de filtros permanece visível para o usuário voltar a selecionar.

## Fora de escopo
- Nenhuma alteração em lógica de negócio, importação, schema ou outras páginas.
- Comportamento dos outros filtros permanece o mesmo (vazio = todos).
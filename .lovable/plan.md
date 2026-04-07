

# Aperfeiçoar busca rápida em todas as abas

## Estado atual
Todas as páginas usam o `DataTable` com busca simples: um campo de texto que filtra todas as colunas por substring. Funciona, mas é básico.

## Exemplos de melhorias possíveis

### 1. Busca por coluna específica
Permitir filtrar por coluna individual clicando no cabeçalho ou com sintaxe tipo `codigo:ABC` no campo de busca.

### 2. Highlight nos resultados
Destacar (amarelo) o texto encontrado nas células que correspondem à busca, facilitando localizar visualmente.

### 3. Botão limpar no campo de busca
Adicionar um "X" dentro do input para limpar a busca rapidamente, em vez de apagar manualmente.

### 4. Debounce na digitação
Adicionar delay de 300ms antes de filtrar, evitando travamentos em tabelas com muitos registros.

### 5. Filtros por coluna no cabeçalho
Adicionar mini-inputs ou dropdowns abaixo de cada cabeçalho de coluna, permitindo filtrar por valores específicos de cada campo simultaneamente.

### 6. Ordenação clicável nas colunas
Clicar no cabeçalho ordena ASC/DESC, com indicador visual (seta).

### 7. Atalho de teclado
`Ctrl+F` ou `Ctrl+K` foca automaticamente no campo de busca.

## Recomendação
Implementar na seguinte ordem de impacto:
1. **Highlight** nos resultados + **botão limpar** (rápido, alto impacto visual)
2. **Ordenação** clicável nas colunas (muito útil para análise)
3. **Debounce** (performance)
4. **Filtros por coluna** (mais complexo, mas poderoso)

## Técnico
Todas as melhorias seriam no componente `DataTable.tsx`, beneficiando automaticamente todas as 9+ páginas que o utilizam: Estoque, Compras, BOM, Onde Usa, Notas Recebimento, Número Série, Conciliação, Engenharia, Auditoria.


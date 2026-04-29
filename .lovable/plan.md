## Objetivo

No filtro **Centro de Custo** da página `/passagens-aereas`, substituir o `<Input>` de texto livre por um **combobox pesquisável** já pré-carregado com todos os centros de custo existentes nos registros, agilizando o filtro.

## Mudanças

**Arquivo:** `src/components/passagens/PassagensDashboard.tsx`

1. **Calcular lista de CCs disponíveis** a partir do `data` recebido:
   ```ts
   const ccsDisponiveis = useMemo(() => {
     const set = new Set<string>();
     data.forEach(r => { const cc = (r.centro_custo ?? '').trim(); if (cc) set.add(cc); });
     return Array.from(set).sort((a, b) => a.localeCompare(b));
   }, [data]);
   ```

2. **Trocar o input de CC** (linhas 248-251) por um `Popover + Command` (mesmo padrão do `ColaboradorCombobox`), com:
   - Botão trigger mostrando o CC selecionado ou "Todos".
   - `CommandInput` para busca textual (mantém a UX de "buscar...").
   - Item "Todos" no topo para limpar o filtro.
   - Lista dos CCs únicos extraídos de `data`.
   - Ícone `Check` indicando o selecionado.

3. **Imports adicionais** no topo: `Popover`, `Command*`, `cn`, ícones `Check` e `ChevronsUpDown`.

4. Comportamento de filtragem permanece o mesmo (`filtered` continua usando `filtroCC.toLowerCase().includes(...)`), só que agora `filtroCC` será sempre o nome exato de um CC ou string vazia.

## Resultado

- Usuário clica no campo "Centro de Custo" e vê imediatamente todos os CCs já cadastrados em passagens.
- Pode digitar para filtrar a lista, ou escolher "Todos" para remover o filtro.
- Comportamento se mantém igual em modo compartilhado (read-only) e admin.


## Resumo por Operador cobrindo TODO o período filtrado

### Problema
Hoje o card "Operadores no período" agrega apenas `data.dados` (página atual da tabela principal, ~100 registros). Se a busca tem 15 páginas, **só os operadores presentes na página visível aparecem**, e suas horas/OPs ficam subestimadas. O aviso "Agregado da página atual (1 de 15)" reflete isso.

### Objetivo
Fazer o card mostrar **todos os operadores do período filtrado**, com horas e OPs totais corretas, independentemente da paginação da tabela principal.

### Estratégia
Disparar uma **segunda requisição** ao backend (mesmos filtros da pesquisa, mas com `tamanho_pagina` grande) só para alimentar o agregado de operadores. A tabela principal continua paginada normalmente.

### Implementação

**`src/pages/AuditoriaApontamentoGeniusPage.tsx`**

1. Novo estado:
   ```ts
   const [operadoresFullData, setOperadoresFullData] = useState<any[] | null>(null);
   const [loadingOperadores, setLoadingOperadores] = useState(false);
   ```

2. Novo `useEffect` que dispara quando `data` muda (ou seja, após cada Pesquisar bem-sucedido):
   - Reusa `buildAuditoriaListParams(filters, 1, 5000)` (mesmo helper já exportado).
   - Chama `api.get('/api/apontamentos-producao', params)` com tamanho_pagina alto (ex.: 5000).
   - Se `total_registros > 5000`, faz loop paginando até consolidar todos.
   - Salva o array completo em `operadoresFullData`.
   - Em caso de erro, faz fallback silencioso para `data.dados` (comportamento atual) e loga via `errorLogger`.

3. Ajustar o `useMemo` `operadoresAgg`:
   - Fonte passa a ser `operadoresFullData ?? aplicarFiltroListaApontGenius`.
   - Aplica os mesmos filtros locais (`statusOp`, `quickFilter`) sobre o dataset completo para manter consistência visual.

4. UI do card:
   - Remover/ajustar o aviso "Agregado da página atual (X de Y)" — quando `operadoresFullData` estiver carregado, mostrar "Agregado de todos os N apontamentos do período".
   - Enquanto `loadingOperadores=true`, exibir um pequeno spinner inline no header do card e desabilitar a paginação interna.

5. Reset: quando o usuário clica Limpar ou muda filtros antes de Pesquisar, zerar `operadoresFullData` para evitar dados obsoletos.

### Detalhes técnicos
- Limite de 5000 por chamada protege a UI; se necessário, paginar até 3 páginas (15k registros) — suficiente para janelas de período típicas. Acima disso, manter o aviso e sugerir Exportar.
- Sem mudança de contrato no backend.
- Reaproveita os helpers `buildAuditoriaListParams` e `formatHorasMin` já existentes.
- A paginação interna do card (10 por página) continua igual.

### Validação
- Pesquisar período com 15 páginas (1500 registros) → card mostra todos os operadores do período, horas batendo com a soma real.
- Trocar página da tabela principal → lista de operadores NÃO muda (continua sendo total do período).
- Mudar filtro de status/quickFilter → operadores recalculam coerentemente sobre o dataset completo.
- Header do card mostra "Agregado de N apontamentos do período" em vez de "página atual".
- Spinner aparece no card enquanto a busca completa carrega; tabela principal já é utilizável antes.


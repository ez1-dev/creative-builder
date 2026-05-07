
## Objetivo

Adicionar a opção **"Mostrar Todos"** (junto com 100/250/500/1000) no rodapé das páginas com paginação, começando por: **Notas de Recebimento**, **Estoque**, **Conciliação EDocs**, **Onde Usa**, e **Painel de Compras** (que já tem o seletor no topo — apenas reaproveita).

## Mudanças

### 1. `src/components/erp/PaginationControl.tsx`
Tornar o componente reutilizável adicionando seletor opcional de tamanho de página:
- Novas props opcionais: `pageSize`, `onPageSizeChange`, `pageSizeOptions` (default `[100, 250, 500, 1000, 'todos']`).
- Quando `pageSize === 'todos'`: oculta navegação de páginas e exibe "Mostrando todos os N registros".
- Mantém retrocompatibilidade total — páginas que não passam as novas props seguem como hoje.

### 2. Páginas que vão ganhar o seletor
Em cada uma destas páginas, adicionar `useState` para `pageSize` (default 100), passar para a chamada `api.get(..., { tamanho_pagina: pageSize === 'todos' ? 100000 : pageSize })`, e passar `pageSize` + `onPageSizeChange` ao `<PaginationControl>`. Quando o usuário escolhe "Todos", mostrar `toast.info` avisando que pode demorar.

- `src/pages/EstoquePage.tsx`
- `src/pages/OndeUsaPage.tsx`
- `src/pages/ConciliacaoEdocsPage.tsx`
- `src/pages/NotasRecebimentoPage.tsx`

### 3. Painel de Compras
Já tem seletor próprio no topo com a opção "Todos". Sem alteração.

## Resultado

Em cada página listada, ao final da tabela aparece "Mostrar: [100 ▾]" com opções 100/250/500/1000/Todos. Escolher "Todos" carrega todos os registros do filtro de uma vez (limite técnico 100.000) e oculta os botões de navegação.

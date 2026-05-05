## Objetivo

Substituir o campo de texto livre "Revenda" no modal **Aplicar Revenda no ERP** (aba Auditoria Revenda do módulo Faturamento Genius) por um **autocomplete** que consulta o ERP em tempo real e exige a seleção de uma revenda cadastrada.

## Arquivo alterado

- `src/components/faturamento/AuditoriaRevendaTab.tsx` (único)

Sem mudanças em endpoints existentes, sem Supabase, sem migrações.

## Mudanças

### 1. Novo tipo e estado

- Tipo `RevendaOption = { codigo: string; nome: string; label: string }`.
- Substituir o estado `revendaInput: string` por:
  - `revendaQuery: string` (texto digitado)
  - `revendaSelecionada: RevendaOption | null`
  - `revendaOpcoes: RevendaOption[]`
  - `buscandoRevendas: boolean`
  - `revendaPopoverOpen: boolean`

### 2. Busca com debounce (~300ms)

- `useEffect` observando `revendaQuery`:
  - Se `query.trim().length < 2`, limpa as opções e não chama a API.
  - Caso contrário, agenda `setTimeout` de 300ms que chama:
    `api.get('/api/faturamento-genius/revendas', { q: query })`
  - Cancela o timer anterior no cleanup. (`api` já injeta o `Authorization: Bearer <jwt>`.)
  - Mapeia a resposta: `result.dados.map(d => ({ codigo: String(d.codigo), nome: d.nome ?? d.nome_fantasia ?? '', label: `${d.codigo} - ${d.nome ?? d.nome_fantasia ?? ''}` }))`.

### 3. UI do campo Revenda

Trocar o `<Input>` simples por um combobox usando `Popover` + `Command` (já presentes em `src/components/ui/`):

- `PopoverTrigger`: botão/`Input` exibindo `revendaSelecionada?.label || revendaQuery`.
- `PopoverContent`: `Command` com `CommandInput` (vinculado a `revendaQuery`), `CommandList`:
  - Estado vazio: "Digite ao menos 2 caracteres".
  - Carregando: spinner + "Buscando revendas...".
  - Sem resultados: "Nenhuma revenda encontrada".
  - `CommandItem` para cada opção; ao selecionar: define `revendaSelecionada`, `revendaQuery = option.label`, fecha o popover.
- Ao digitar no `CommandInput`, limpa `revendaSelecionada` (forçando nova seleção válida).

### 4. Validação no `aplicarRevenda()`

- Antes de montar o payload:
  ```ts
  if (!revendaSelecionada) {
    toast.error('Selecione uma revenda cadastrada no ERP.');
    return;
  }
  ```
- Remover validação atual baseada em `revendaInput.trim()`.

### 5. Payload

Substituir `revenda: revendaInput.trim()` por `revenda: revendaSelecionada.codigo` nos dois ramos (`NF` e `PEDIDO`). Demais campos inalterados.

### 6. Reset

- `abrirAplicar(row)`: zera `revendaQuery`, `revendaSelecionada`, `revendaOpcoes`. (Não pré-popula com `row.revenda`, pois esse texto não é necessariamente um código cadastrado.)
- `fecharAplicar()`: idem ao fechar.

### 7. Pós-sucesso

Mantém comportamento atual: toast `"Revenda aplicada no ERP com sucesso"`, fecha modal, `consultar(pagina)`.

## Fora de escopo

- Endpoint de consulta da auditoria, endpoint de aplicar, demais colunas da tabela e filtros — inalterados.

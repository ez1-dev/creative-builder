## Painel de Compras — usar `todos=true` em vez de loop de páginas

O backend agora aceita `todos=true` no `/api/painel-compras` e devolve tudo numa única resposta atômica. Trocar o loop client-side por uma chamada só.

### Mudanças (apenas `src/pages/PainelComprasPage.tsx`)

1. **`search` — branch `tamanhoEfetivo === 'todos'`**
   Substituir a lógica de página 1 + paralelas + concatenação por uma única chamada:
   ```ts
   const result = await api.get<PainelComprasResponse>(
     '/api/painel-compras',
     buildParams(1, 1000, { /* params extras: todos */ }),
   );
   ```
   Implementação: adicionar `params.todos = true` em `buildParams` quando estiver em modo "todos" (passando uma flag via `opts`), ou simplesmente inserir `todos: true` no objeto retornado pelo branch "todos" antes do `api.get`. `tamanho_pagina` continua sendo enviado (1000) — o backend ignora quando `todos=true`. Setar `data` direto com o `result`, `setPagina(1)`. Remover o cap de 200 páginas e o toast de aviso.

2. **Demais tamanhos** — sem mudança.

3. **Rodapé "Exibindo X de Y registros filtrados"** — mantém como está (já implementado).

### Fora de escopo
- Backend (já feito).
- Export Excel, KPIs, demais abas.

### Validação
- Selecionar Registros = Todos → Network mostra uma única chamada `/api/painel-compras?...&todos=true`, grid renderiza todos os registros, rodapé "Exibindo X de Y".

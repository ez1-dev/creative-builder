## Problema

Na tela `/numero-serie`, o campo **"Origem OP"** está como `readOnly` (linha 479 de `NumeroSeriePage.tsx`), com o placeholder "Auto ao buscar contexto". O usuário quer poder digitar/sobrescrever a origem da OP manualmente — útil quando o backend retorna `origem_op` vazia ou quando ele precisa forçar/corrigir o valor antes de buscar contexto.

## Mudanças — `src/pages/NumeroSeriePage.tsx`

### 1. Tornar o input "Origem OP" editável (linha 479)

Substituir:
```tsx
<Input value={filters.origem_op} readOnly tabIndex={-1}
       className="h-8 text-xs bg-muted/50 font-mono"
       placeholder="Auto ao buscar contexto" />
```
por um input editável normal (mesmo padrão dos outros filtros), mantendo `font-mono`:
```tsx
<Input value={filters.origem_op}
       onChange={e => setFilters(f => ({ ...f, origem_op: e.target.value }))}
       className="h-8 text-xs font-mono"
       placeholder="Ex.: 250" />
```

### 2. Preservar valor digitado pelo usuário ao buscar contexto

Hoje `buscarContexto` (linhas ~177 e ~444) sobrescreve `filters.origem_op` com o valor retornado pelo backend. Ajustar para:
- Se o usuário **já digitou** algo em `filters.origem_op` antes de buscar, **manter** o valor digitado (não sobrescrever).
- Se estava vazio, usar o valor do backend como hoje.

Lógica:
```ts
origem_op: prevOrigemOp.trim() ? prevOrigemOp : (opMismatch ? '' : (result.contexto?.origem_op || ''))
```

(capturar `prevOrigemOp = filters.origem_op` antes da chamada).

### 3. Usar `filters.origem_op` no cálculo de divergência quando `contexto.origem_op` estiver vazio

Em `divergenciaOrigem` (linhas 218–226) e na renderização do Card de Contexto, usar como fallback o valor digitado:
```ts
const oOp = (contexto.origem_op || filters.origem_op || '').trim();
```
Assim, se o backend não retornar `origem_op` mas o usuário digitar manualmente, a validação visual continua funcionando.

### 4. (Opcional, no `limpar()`) — manter o reset atual

`limpar()` já zera `origem_op: ''` (linha 413), nada muda.

## Fora de escopo

- Enviar `origem_op` digitada para o backend nos endpoints `/contexto` e `/reservar` — o backend hoje deriva origem do banco; alterar o contrato fica para outra entrega caso necessário. Esta mudança é puramente de UI (permitir digitar e usar localmente para validação visual).

## Arquivos afetados

- `src/pages/NumeroSeriePage.tsx`

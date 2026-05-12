## Problema

Ao abrir `/regras-senior/regras` a tela quebra com `TypeError: sortedData.map is not a function`. A causa é que `seniorApi.listarRegras` (e os outros endpoints de listagem em `src/lib/senior/api.ts`) está tipado como retornando `RegraLSP[]`, mas a FastAPI devolve um objeto paginado (algo como `{ items: [...], total, page }`). Como `data` deixa de ser array, o `useMemo` que monta `filteredData`/`sortedData` no `DataTable` quebra ao tentar `.map()`.

## Correção (somente frontend / camada de apresentação)

1. **`src/lib/senior/api.ts`** — criar helper `unwrapList<T>(resp)` que aceita tanto `T[]` quanto `{ items: T[] }` / `{ data: T[] }` / `{ results: T[] }` e sempre devolve `T[]`. Aplicar nos métodos:
   - `listarRegras`
   - `listarIdentificadores`
   - `listarSnapshots`
   - `listarAuditoria`
   - `listarVersoes`
   Mantém a tipagem `Promise<T[]>` para os callers continuarem iguais.

2. **`src/components/erp/DataTable.tsx`** — defesa em profundidade: logo no início do componente, normalizar `const safeData = Array.isArray(data) ? data : []` e usar `safeData` em `filteredData`, no `data.length` do header de busca e no empty state. Evita que qualquer outra tela com payload inesperado derrube a UI.

3. **Listas das Regras Senior** (`RegrasList.tsx`, `IdentificadoresList.tsx`, `AuditoriaList.tsx`, `SnapshotsList.tsx`) — garantir `setData(Array.isArray(rows) ? rows : [])` no `try` (o `unwrap` da api.ts já cobre, mas isto blinda contra retornos vazios/undefined).

## Fora do escopo

- Nenhuma mudança no FastAPI / contrato do backend.
- Sem alteração de regra de negócio, status, RLS ou autenticação.
- Não mexer em `src/integrations/supabase/*` nem no `.env`.

## Verificação

- Recarregar `/regras-senior/regras` → tabela renderiza (lista ou empty state) sem erro no console.
- Validar também `/regras-senior/identificadores`, `/auditoria` e `/snapshots`.

## Problema

A tela `/etl/tarefas/ATU_COMERCIAL` está quebrando com:

```
Cannot read properties of undefined (reading 'toLowerCase')
```

Mapeamento dos `.toLowerCase()` / `.toUpperCase()` envolvidos nessa rota (e nos modais abertos por ela):

| Arquivo | Linha | Chamada | Risco |
|---|---|---|---|
| `src/components/etl/EditarSqlModal.tsx` | 64, 66, 68 | `col.toLowerCase()` / `col.toUpperCase()` em `pickCell(row, col)` | **Alto** — `col = c.nome` da resposta do backend; se a coluna vier com chave diferente (`name`, `column_name`) ou `null`, quebra. |
| `src/components/etl/ExecutarModal.tsx` | 109 | `p.toLowerCase()` | Médio — `p` vem de `extrairPlaceholders` (string garantida), mas convém blindar. |
| `src/components/erp/DataTable.tsx` | 121, 126, 142, 143 | `debouncedSearch.toLowerCase()`, `String(val).toLowerCase()` | Baixo — `debouncedSearch` é string de state inicial `''`; `val` já vai por `String()`. |

`EtlTarefaDetalhePage` em si não faz `.toLowerCase()` direto, mas:
- Quando `tarefa` não é encontrada, renderiza o título com `nome` da URL e segue chamando `acoesTarefa(t.id)` mesmo assim — **não há fallback "Tarefa não encontrada"**.
- Passa `acao` para `EditarSqlModal`, que dispara o `pickCell` defeituoso quando o preview do SQL volta.

## Mudanças

### 1. Novo helper `src/lib/etl/safeString.ts`
```ts
export const safeLower = (v: unknown) => String(v ?? '').toLowerCase();
export const safeUpper = (v: unknown) => String(v ?? '').toUpperCase();
```

### 2. `src/components/etl/EditarSqlModal.tsx`
- Importar `safeLower` e reescrever `pickCell` para nunca chamar `.toLowerCase()` em `undefined`:
  ```ts
  const pickCell = (row: Record<string, any>, col: unknown): any => {
    if (!row || typeof row !== 'object') return undefined;
    const key = String(col ?? '');
    if (!key) return undefined;
    if (row[key] !== undefined) return row[key];
    const lower = safeLower(key);
    if (row[lower] !== undefined) return row[lower];
    const upper = safeUpper(key);
    if (row[upper] !== undefined) return row[upper];
    const found = Object.keys(row).find((x) => safeLower(x) === lower);
    return found ? row[found] : undefined;
  };
  ```
- No render do preview (linhas 470–491), aceitar coluna com nome alternativo: `const colName = c?.nome ?? (c as any)?.name ?? (c as any)?.column ?? '';` e usar `colName` no `<th>`, `key`, e `pickCell`.
- `acaoRef` (linhas 106–114): já tolerante, mas garantir `String(...)` no retorno.

### 3. `src/components/etl/ExecutarModal.tsx`
- Trocar `p.toLowerCase()` por `safeLower(p)` (linha 109).

### 4. `src/components/erp/DataTable.tsx`
- Substituir `debouncedSearch.toLowerCase()` por `safeLower(debouncedSearch)` (defensivo).
- Já usa `String(val).toLowerCase()`, mantém.

### 5. `src/pages/EtlTarefaDetalhePage.tsx`
- Após `load()`: se `t` for `null/undefined`, renderizar card amigável **"Tarefa ETL não encontrada"** com botão "Voltar" e **não** tentar carregar ações/execuções.
- Tornar `nome` seguro: usar `safeUpper(nome)` ao buscar e exibir o título.
- Em colunas de `acoes`/`execucoes`, garantir que os campos potencialmente nulos (`r.id_acao`, `r.endpoint_api`, `r.status`) não sejam acessados sem fallback ao montar a chave do `statusColor` (já usa `??`, OK).

### 6. (Opcional preventivo, fora do front)
A query SQL sugerida pelo usuário para conferir os campos `nome_tarefa`/`codigo_tarefa` no banco fica **fora deste plano** — é diagnóstico, não correção de UI. Não vou rodar migration agora porque a tabela `public.etl_tarefas` já tem `nome_tarefa` no schema atual e o erro reportado é puramente de runtime no frontend.

## Critério de aceite
- `/etl/tarefas/ATU_COMERCIAL` carrega sem `Cannot read properties of undefined`.
- Se a tarefa não existir, mostra "Tarefa ETL não encontrada" em vez de tela em branco/quebrada.
- Abrir o modal "SQL" e rodar preview com qualquer formato de coluna do backend (`nome`, `name`, ou linhas com chaves em casing diferente) não derruba a tela.
- Nenhum `.toLowerCase()`/`.toUpperCase()` direto em campo vindo do backend nas telas de ETL.

## Fora de escopo
- Migrations no `public.etl_tarefas`.
- `src/integrations/supabase/{client,types}.ts` e `.env`.
- Outras telas que não `/etl/*`.

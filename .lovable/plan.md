## Mudanças

### 1. Frontend — `src/components/etl/EditarSqlModal.tsx`
Na renderização da tabela de preview, trocar o acesso direto `l[c.nome]` por um helper com fallback case-insensitive:

```ts
const pickCell = (row: Record<string, any>, col: string) => {
  if (row[col] !== undefined) return row[col];
  if (row[col.toLowerCase()] !== undefined) return row[col.toLowerCase()];
  if (row[col.toUpperCase()] !== undefined) return row[col.toUpperCase()];
  // último recurso: match case-insensitive em qualquer chave da linha
  const k = Object.keys(row).find((x) => x.toLowerCase() === col.toLowerCase());
  return k ? row[k] : undefined;
};
```
Usar `pickCell(l, c.nome)` no `<td>`. Resolve o caso de a FastAPI ainda devolver chaves em casing diferente do header.

### 2. Backend FastAPI — documentar em `docs/backend-etl-central.md`
Na seção `POST /testar-sql`, deixar explícito:
- `_etl_rows_to_dict` (ou equivalente) **deve** usar `cursor.description[i][0]` **exatamente** como veio do driver, sem `.lower()` / `.upper()`. As chaves de cada linha precisam casar 1:1 com `colunas[i].nome` da resposta.
- A resposta correta para `SELECT 'SERVIÇOS' AS CD_TP_MOVIMENTO` deve trazer `{"CD_TP_MOVIMENTO": "SERVIÇOS"}`, não `{"cd_tp_movimento": ...}`.

## Fora de escopo
- Implementação Python (fora deste repo).
- `src/integrations/supabase/{client,types}.ts` e `.env`.
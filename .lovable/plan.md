## Objetivo

Corrigir o call site de `testarSqlAcao` em `EditarSqlModal.tsx` para parar de enviar o UUID `acao.id`. O backend (FastAPI + Supabase novo) espera `codigo_acao` (texto) ou `id_acao` (numérico) — nunca UUID.

## Alteração

**Arquivo:** `src/components/etl/EditarSqlModal.tsx` (linha 203)

Trocar:

```ts
const resp = await testarSqlAcao(acao.id, {
  sql_template: sqlExibido,
  parametros,
  limite,
});
```

Por:

```ts
const acaoRef =
  (acao as any).codigo_acao ||
  (acao as any).id_acao ||
  acao.nome ||
  acao.id;

const resp = await testarSqlAcao(acaoRef, {
  sql_template: sqlExibido,
  parametros,
  limite,
});
```

Ordem de prioridade: `codigo_acao` (texto, ex.: `VM_FATURAMENTO`) → `id_acao` (numérico) → `nome` → `id` (UUID, último recurso).

`testarSqlAcao` em `src/lib/etl/api.ts` já aceita `string | number` e aplica `encodeURIComponent`, então nenhuma mudança ali.

## Critério de aceite

- `VM_FATURAMENTO` → `POST /api/etl/acoes/VM_FATURAMENTO/testar-sql`
- Ação com `id_acao=1` e sem `codigo_acao` → `POST /api/etl/acoes/1/testar-sql`
- Não deve mais aparecer `/api/etl/acoes/7058eb11-.../testar-sql` quando houver `codigo_acao` ou `id_acao`.

## Fora de escopo

- Backend FastAPI e migração no Supabase `razvdo...` (já tratados em planos anteriores).
- `src/lib/etl/api.ts` (já correto).
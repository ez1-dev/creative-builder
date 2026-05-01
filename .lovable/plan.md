## Diagnóstico

A página `/monitor-usuarios-senior` (e o alias `/usuarios-conectados`) já chama `GET /api/senior/sessoes` autenticado com `Authorization: Bearer {access_token}` e o login já envia `{ usuario, senha }` (itens 5, 6 e 7 do pedido já estão corretos no código atual).

O problema está na **linha 158** de `src/pages/MonitorUsuariosSeniorPage.tsx`:

```ts
const rawList: any[] = Array.isArray(res) ? res : (res?.sessoes ?? res?.data ?? []);
```

Ela tenta `res.sessoes` e `res.data`, mas o backend retorna `{ total, dados: [...] }`. Por isso `rawList` fica `[]` mesmo quando o SQL retorna registros, e a tabela aparece vazia.

Além disso, falta logar os 4 itens pedidos e proteger campos null em `normalizeSessao`.

## Mudanças

Arquivo único: `src/pages/MonitorUsuariosSeniorPage.tsx`

### 1. Leitura robusta do response (substitui linha 158)

```ts
let rawList: any[] = [];
if (Array.isArray(res)) {
  rawList = res;
} else if (Array.isArray((res as any)?.dados)) {
  rawList = (res as any).dados;
} else if (Array.isArray((res as any)?.sessoes)) {
  rawList = (res as any).sessoes;
} else if (Array.isArray((res as any)?.data)) {
  rawList = (res as any).data;
} else {
  rawList = [];
}
```

### 2. Logs obrigatórios (antes do `setData`)

```ts
console.log('[MonitorSenior] response completo:', res);
console.log('[MonitorSenior] response.total:', (res as any)?.total);
console.log('[MonitorSenior] response.dados:', (res as any)?.dados);
console.log('[MonitorSenior] linhas interpretadas para a tabela:', rawList.length);
```

### 3. Proteção contra campos null em `normalizeSessao`

Garantir tolerância para:
- `codigo_modulo`, `modulo_acessado`, `mensagem_admin` chegando `null` → manter `undefined`/`'-'` na renderização (já tratado com `?? '-'` na tabela, vou só reforçar no normalize com `?? undefined`).
- `data_hora_conexao` chegando como número (epoch ms/seg) ou string ISO → converter com helper:

```ts
const toIsoDate = (v: any): string | undefined => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v; // segundos vs ms
    const d = new Date(ms);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toISOString();
  }
  return undefined;
};
```

### 4. Mensagem "Nenhuma sessão conectada encontrada."

Hoje a tabela mostra um estado vazio genérico. Vou ajustar para que, quando `rawList.length === 0` **e** o status for `online`, apareça exatamente o texto pedido: `Nenhuma sessão conectada encontrada.`

## O que NÃO muda

- Login (`{ usuario, senha }`) — já correto.
- Header `Authorization: Bearer {access_token}` — já correto em `src/lib/api.ts`.
- Retry em 401 (limpa token + relogin) — já implementado em `api.ts`.
- Filtros, KPIs, ordenação, export CSV e alias de rota — preservados.

## Validação

Após aplicar, abrir `/monitor-usuarios-senior` e conferir no console:
- `response completo` mostrando `{ total, dados: [...] }`
- `linhas interpretadas para a tabela: N` igual a `total`
- Tabela renderiza as N linhas, sem quebrar mesmo com `codigo_modulo` / `modulo_acessado` / `mensagem_admin` null.

# Plano: Ajustes no frontend Regras Senior para casar com a FastAPI

O backend já existe (rotas `/api/senior/*` corretas) e o `seniorApi` já chama esses paths. O que falta é: normalizar respostas (`dados`/`items`), aceitar campos UPPER do banco, traduzir paginação e melhorar mensagens 404/vazias. **Nenhuma mudança em rotas, layout ou auth.**

## 1. `src/lib/senior/api.ts` — normalização e paginação

- Em `unwrapList`, incluir a chave **`dados`** (que é o que o backend retorna), além de `items/data/results/rows`.
- Criar helper `toApiPaging(f)` que converte `{ page, pageSize }` em `{ pagina, tamanho_pagina }` antes de enviar como query string. Aplicar nos endpoints de lista (`listarRegras`, `listarIdentificadores`, `listarAuditoria`, `listarVersoes`, `listarSnapshots`).
- Manter o `safe(...)` que já está no `listarSnapshots`/`listarVersoes` e estender ao `listarAuditoria` e `listarIdentificadores` para retornar `[]` em 404 (sem quebrar a tela) — o toast de erro continua aparecendo.

## 2. `src/lib/senior/types.ts` — aceitar campos UPPER

A API devolve `ID_REGRA`, `NOME_REGRA`, `CODREG_ERP`, `MODSIS`, `IDEREG`, `CODTNS`, `STATUS_REGRA`, `DATA_CRIACAO`, `USUARIO_CRIACAO`, `AMBIENTE`, `TICKET`, etc.

Criar um mapper único em `src/lib/senior/mappers.ts`:

```ts
export const mapRegra = (r: any): RegraLSP => ({
  id: r.id ?? r.ID_REGRA,
  nome_regra: r.nome_regra ?? r.NOME_REGRA,
  codreg_erp: r.codreg_erp ?? r.CODREG_ERP ?? null,
  modsis: r.modsis ?? r.MODSIS ?? null,
  idereg: r.idereg ?? r.IDEREG ?? null,
  codtns: r.codtns ?? r.CODTNS ?? null,
  descricao: r.descricao ?? r.DESCRICAO ?? null,
  ambiente: r.ambiente ?? r.AMBIENTE ?? null,
  ticket: r.ticket ?? r.TICKET ?? null,
  motivo: r.motivo ?? r.MOTIVO ?? null,
  fonte_lsp: r.fonte_lsp ?? r.FONTE_LSP ?? null,
  status_regra: r.status_regra ?? r.STATUS_REGRA,
  criado_por: r.criado_por ?? r.USUARIO_CRIACAO ?? null,
  criado_em: r.criado_em ?? r.DATA_CRIACAO ?? null,
  atualizado_em: r.atualizado_em ?? r.DATA_ATUALIZACAO ?? null,
});
```

Equivalentes para `mapIdentificador`, `mapAuditoria`, `mapVersao`, `mapSnapshot`. Aplicar nos retornos do `seniorApi` (`.map(mapRegra)` após `unwrapList`).

## 3. Mensagens vazias amigáveis

- `RegrasList`: `emptyMessage="Nenhuma regra cadastrada ainda."`
- `IdentificadoresList`: `emptyMessage="Nenhum identificador encontrado."`
- `AuditoriaList`: já existe — trocar para `"Nenhuma alteração registrada ainda."`
- `SnapshotsList`: manter atual.

## 4. Tratamento 401 / 404 no `src/lib/api.ts`

- 401: já existe (toast + erro). Adicionar redirect para `/login` quando o erro vier de endpoints `/api/senior/*` e não houver sessão ativa.
- 404: enriquecer a mensagem para `"Endpoint não encontrado na API. Verifique se o backend foi atualizado e reiniciado."` (apenas para paths `/api/senior/*`).

## 5. Base URL

O projeto já usa `VITE_API_BASE_URL`/`VITE_API_URL` em `getApiBaseUrl()`. **Não vou renomear para `VITE_ERP_API_URL`** para não quebrar o resto do app — vou apenas garantir o `.replace(/\/$/, '')` no `getApiBaseUrl()` para tolerar barra final.

## Arquivos a alterar

- `src/lib/api.ts` — strip trailing slash; mensagem 404 específica para `/api/senior/*`.
- `src/lib/senior/api.ts` — `unwrapList` aceita `dados`; helper `toApiPaging`; `safe` em `listarAuditoria` e `listarIdentificadores`; aplicar mappers.
- `src/lib/senior/mappers.ts` (novo) — mappers UPPER → camelCase tipado.
- `src/components/regras-senior/RegrasList.tsx` — emptyMessage.
- `src/components/regras-senior/IdentificadoresList.tsx` — emptyMessage.
- `src/components/regras-senior/AuditoriaList.tsx` — emptyMessage.

## Fora de escopo

- Não criar/remover rotas.
- Não mexer em autenticação Lovable Cloud.
- Não recriar componentes do módulo.
- Não alterar `.env` (gerenciado pelo usuário em Configurações).

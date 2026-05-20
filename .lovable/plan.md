## Objetivo
Corrigir o erro `FastAPI 422: body.sql_base Field required` nas chamadas do módulo Desenvolvimento de Relatórios, padronizar o nome do campo SQL como `sql_base` em todos os payloads enviados ao FastAPI e espelhar create/update no FastAPI além do Lovable Cloud.

## Mudanças em `src/lib/relatorios/api.ts`

### 1. `validarSql` — alterar assinatura e payload
```ts
export async function validarSql(sql_base: string, parametros: Record<string, unknown> = {}) {
  if (!sql_base?.trim()) throw new Error('Informe o SQL do relatório antes de continuar.');
  return postFastApi(
    '/api/relatorios/validar-sql',
    { sql_base, parametros },
  );
}
```

### 2. `previewSql` — alterar payload
```ts
export async function previewSql(sql_base: string, parametros: Record<string, unknown>) {
  if (!sql_base?.trim()) throw new Error('Informe o SQL do relatório antes de continuar.');
  return postFastApi<PreviewResult>('/api/relatorios/preview', {
    sql_base, parametros, limite: 100,
  });
}
```

### 3. Novas funções para espelhar no FastAPI

```ts
export async function createRelatorioFastApi(payload: { ... }) {
  if (!payload.sql_base?.trim()) throw new Error('Informe o SQL do relatório antes de continuar.');
  return postFastApi('/api/relatorios', payload);
}

export async function updateRelatorioFastApi(id: string, payload) {
  if (!payload.sql_base?.trim()) throw new Error('Informe o SQL do relatório antes de continuar.');
  return putFastApi(`/api/relatorios/${id}`, payload);   // novo helper PUT
}
```

Helper genérico `putFastApi` análogo a `postFastApi` (mesmos headers + token + ngrok).

### 4. `createRelatorio` / `updateRelatorio` (Cloud) — chamar FastAPI em paralelo
- Após gravar com sucesso no Cloud, montar payload no formato exigido:
  ```ts
  {
    nome, descricao, modulo, categoria,
    fonte_dados: relatorio.fonte_dados ?? 'ERP_SENIOR',
    sql_base: relatorio.sql_query ?? '',
    parametros_config: parametros,
    colunas_config: colunas,
    layout_config: layout,
    status: relatorio.status?.toUpperCase() ?? 'RASCUNHO',
  }
  ```
- Chamar `createRelatorioFastApi` / `updateRelatorioFastApi` somente quando `sql_base` não estiver vazio (rascunhos sem SQL não chamam FastAPI).
- Erros do FastAPI não devem reverter o gravar no Cloud: capturar e exibir toast de aviso ("Salvo localmente, falha ao sincronizar com o ERP: …"). O save principal continua sendo o Cloud (RLS/listagem).

## Mudanças nas chamadas (call-sites)

### `src/components/relatorios/tabs/SqlTab.tsx`
- Antes de chamar `validarSql(sql)`, validar `sql.trim()` e mostrar toast `"Informe o SQL do relatório antes de continuar."` em vez de chamar a API.
- A chamada continua `validarSql(sql)` (segundo parâmetro opcional).

### `src/components/relatorios/ReportPreview.tsx`
- Antes de `previewSql(relatorio.sql_query ?? '', typed)`, validar SQL não vazio e mostrar mesmo toast. Não chamar a API se vazio.

### `src/components/relatorios/ReportEditor.tsx`
- Em `handleSave` / publicar: o fluxo continua chamando `createRelatorio` / `updateRelatorio` do `api.ts`, que internamente fará o espelhamento no FastAPI. Sem mudanças visíveis aqui além do tratamento de toast já existente.

## Comportamento da validação de SQL vazio
- Em `validarSql`, `previewSql`, `createRelatorioFastApi`, `updateRelatorioFastApi`: `if (!sql_base?.trim()) throw new Error('Informe o SQL do relatório antes de continuar.')`.
- Nos call-sites (SqlTab/ReportPreview), também validar antes para já exibir o toast sem disparar a chamada.

## Fora de escopo
- Mudanças no editor SQL, no schema do Cloud, em RLS ou na listagem.
- Migrar create/update completamente para o FastAPI (Cloud continua sendo a fonte primária).
- Endpoint `/api/relatorios/{id}/executar` e exportações (já enviam só `parametros`, não foram citados no erro).

## Resumo dos arquivos a editar
- `src/lib/relatorios/api.ts` — renomeia `sql` → `sql_base`, adiciona `putFastApi`, `createRelatorioFastApi`, `updateRelatorioFastApi`, e chama-os de dentro de `createRelatorio`/`updateRelatorio` quando há SQL.
- `src/components/relatorios/tabs/SqlTab.tsx` — validação de SQL vazio antes de chamar a API.
- `src/components/relatorios/ReportPreview.tsx` — validação de SQL vazio antes de chamar preview.

Nenhuma migração de banco de dados é necessária.
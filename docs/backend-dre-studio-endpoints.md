# Backend — DRE Studio (`/api/contabil/*`)

Status atual (verificado em 12/07/2026 contra `https://api-erp-renato.ngrok.app`):

- `GET /openapi.json` → 200
- `GET /api/contabil/health` → **404 Not Found**
- Nenhuma rota com prefixo `/api/contabil/` existe. Rotas de contabilidade hoje: `/api/contabilidade/*`, `/api/bi/contabilidade/*`, `/api/export/contabilidade/*`.

Enquanto os endpoints abaixo não forem publicados, o menu do DRE Studio fica **oculto** no sidebar (as rotas permanecem registradas em `src/App.tsx` para permitir pré-visualização direta pela URL). O banner das telas informa "Módulo aguardando backend".

Cliente front-end: `src/lib/contabil/dreStudioApi.ts`.
Tipos: `src/lib/contabil/dreStudioTypes.ts`.

## Contrato esperado

Prefixo base: `/api/contabil` na **mesma API principal** do ERP (porta 8070).
Autenticação: mesmo esquema dos demais módulos (`Authorization: Bearer <token>`).
Header opcional: `ngrok-skip-browser-warning: true`.

### Health

- `GET /api/contabil/health`
  - Resposta 200:
    ```json
    { "erp": "ok", "supabase": "ok" }
    ```
  - Cada campo aceita string (`ok|up|online|conectado`) ou `{ "status": "ok" }`.

### Estrutura padrão

- `GET /api/contabil/estrutura-padrao?tipo_modelo=DRE|BALANCO`
  - Retorna uma árvore hierárquica sugerida (linhas com `codigo`, `descricao`, `tipo`, `sinal`, `nivel`, `parent_codigo`).

### Modelos

- `GET /api/contabil/modelos?codemp={int}` → `{ itens: DreModelo[] }`
- `POST /api/contabil/modelos` — body:
  ```json
  { "codemp": 1, "nome": "DRE Gerencial", "tipo_modelo": "DRE", "descricao": null, "ativo": true }
  ```
- `GET /api/contabil/modelos/{modelo_id}` → `{ modelo, linhas: DreLinha[], contas?: DreContaVinculada[] }`
- `PUT /api/contabil/modelos/{modelo_id}`
- `DELETE /api/contabil/modelos/{modelo_id}`

`modelo_id` sempre UUID.

### Linhas

- `POST /api/contabil/modelos/{modelo_id}/linhas`
- `PUT /api/contabil/modelos/{modelo_id}/linhas/{linha_id}`
- `DELETE /api/contabil/modelos/{modelo_id}/linhas/{linha_id}`

### Contas vinculadas

- `GET /api/contabil/modelos/{modelo_id}/linhas/{linha_id}/contas` → `{ dados: DreContaVinculada[] }`
- `POST /api/contabil/modelos/{modelo_id}/linhas/{linha_id}/contas` — body:
  ```json
  {
    "codemp": 1, "ctared": 12345, "clacta": "3.01.001",
    "descta": "Receita Bruta", "nivcta": 3, "anasin": "A",
    "incluir_subcontas": true, "sinal": 1
  }
  ```
- `DELETE /api/contabil/modelos/{modelo_id}/linhas/{linha_id}/contas/{vinculo_id}`

### Plano de contas / Centros de custo

- `GET /api/contabil/plano-contas?codemp&tipo&somente_ativas&somente_analiticas&busca` → `{ dados: DrePlanoConta[] }`
- `GET /api/contabil/centros-custo?codemp` → `{ dados: DreCentroCusto[] }`

### Orçamento

- `GET /api/contabil/orcamento?modelo_id&codemp&codfil&anomes_ini&anomes_fim` → `{ dados: DreOrcamentoItem[] }`
- `POST /api/contabil/orcamento` — grava/atualiza item (`modelo_id`, `linha_id`, `codemp`, `codfil?`, `anomes`, `valor`).

### Resultado (cache)

- `GET /api/contabil/modelos/{modelo_id}/resultado-cache?codemp&codfil&anomes_ini&anomes_fim&codccu`
  - Resposta:
    ```json
    {
      "colunas": ["202601","202602","..."],
      "periodos": [...],
      "linhas": [{ "codigo":"3.01","descricao":"Receita","nivel":1,"valores":{"202601":1234.56}, "tipo":"conta|totalizador|formula" }],
      "fonte": "cache|realtime",
      "origem": null,
      "atualizado_em": "2026-07-12T19:00:00Z"
    }
    ```

### (Opcional) Drill-down

- `GET /api/contabil/modelos/{modelo_id}/drill?linha_id&codemp&anomes_ini&anomes_fim`
  - Enquanto não existir, o botão de drill fica desabilitado no front (kind `endpoint_indisponivel`).

## Tratamento de erros esperado

- 401 → sessão expirada.
- 404 em `modelos/{id}` → modelo inexistente (`modelo_not_found`).
- 409 → conflito de gravação.
- 405/501 → recurso ainda não implementado (`endpoint_indisponivel`).
- Mensagem detalhada em `detail` (string) ou `{ detail: {...} }`.

## Reativação no front

Quando os endpoints acima estiverem publicados:

1. Restaurar o sub-grupo "DRE Studio" em `src/components/AppSidebar.tsx` (bloco removido em 12/07/2026, ver histórico do arquivo).
2. Nenhuma outra alteração é necessária — cliente, hooks, tipos e páginas já estão alinhados ao contrato acima.

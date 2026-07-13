# DRE — API integrada

Este documento centraliza como o frontend do Sapiens Control Center consome a
DRE materializada pelo backend contábil unificado.

## Base URL

- **Oficial:** `https://dreconfiguravel.ngrok.app` (túnel público para a
  aplicação FastAPI que roda localmente na porta **8070**).
- **Variável de ambiente:** `VITE_CONTABIL_API_URL` (oficial). `VITE_DRE_API_URL`
  ainda é aceita como fallback legado. Se ambas ausentes, o cliente cai no
  default acima. O `.env` do projeto é auto-gerado pelo Cloud — para override
  em desenvolvimento local use `.env.local`.
- **Bloqueado:** URLs contendo `.supabase.co` são ignoradas com `console.warn`
  (Supabase Auth ≠ API contábil).
- **Legado bloqueado:** qualquer URL contendo `:8090` é ignorada e o cliente
  loga `console.warn` — a API antiga da porta 8090 foi removida.
- **Legado bloqueado:** `api-erp-renato.ngrok.app` **não** atende
  `/api/contabil/*`; também é ignorada com aviso.

Centralizado em `src/lib/contabil/contabilApi.ts` (`getContabilBaseUrl`) —
nenhum componente monta URLs próprias.

## Endpoints usados pela tela `Contabilidade — DRE`

Todos os endpoints exigem `Authorization: Bearer <jwt>` (injetado pelo cliente)
e o header `ngrok-skip-browser-warning: true`.

| Endpoint | Método | Uso |
|---|---|---|
| `/api/contabil/health` | GET | Health check exibido na faixa de metadados. |
| `/api/contabil/dre/matriz` | GET | Matriz materializada consumida pela tabela. |
| `/api/contabil/dre/sincronizar` | POST | Sincroniza saldos do ERP para o período. |
| `/api/contabil/dre/recalcular` | POST | Recalcula a materialização da DRE. |
| `/api/contabil/dre/conciliacao-bi` | GET | Comparação DRE × BI para a aba de conciliação. |

### GET `/api/contabil/dre/matriz`

Query: `anomes_ini`, `anomes_fim`, `modelo_id?`, `unidade?`.

Resposta:

```json
{
  "linhas": [
    {
      "descricao": "Receita Bruta de Vendas",
      "codigo_linha": "RECEITA_BRUTA",
      "valores": {
        "202601": { "realizado": 8497854.30, "orcado": 13397475.00 },
        "202602": { "realizado": 9878843.02, "orcado": 15071110.00 }
      }
    }
  ],
  "meta": {
    "fonte_saldo": "E640RAT",
    "periodo": "janeiro a julho de 2026",
    "ultima_sincronizacao": "2026-07-12T23:45:00-03:00",
    "ultima_materializacao": "2026-07-12T23:47:00-03:00",
    "status": "atualizado",
    "status_conciliacao": "pendente",
    "modelo_id": "…", "modelo_nome": "DRE Oficial",
    "meses_incompletos": []
  }
}
```

O frontend **não** recalcula nenhuma linha; apenas formata `realizado`/`orcado`
e calcula A.V. visual (`realizado / receita_bruta_do_mes * 100`).

### POST `/api/contabil/dre/sincronizar`

```json
{
  "anomes_ini": "202601",
  "anomes_fim": "202607",
  "fonte_saldo": "E640RAT",
  "limpar_periodo": true
}
```

Ação administrativa: exige permissão e confirmação. Após sucesso, a UI dispara
automaticamente `/recalcular` e refaz o fetch da matriz.

### POST `/api/contabil/dre/recalcular`

```json
{
  "anomes_ini": "202601",
  "anomes_fim": "202607",
  "modelo_id": "…"
}
```

### GET `/api/contabil/dre/conciliacao-bi`

Retorna `{ linhas: [{ linha, anomes, valor_app, valor_bi, diferenca,
diferenca_pct, status }], tolerancia, gerado_em }`. A tolerância padrão é
`R$ 1,00`. O XLS oficial do BI **não** é lido pelo navegador — o backend faz o
carregamento e a comparação.

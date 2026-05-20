# Backend FastAPI — Módulo Relatórios

Especificação dos endpoints necessários no backend FastAPI para suportar o módulo **Desenvolvimento de Relatórios** do frontend.

> **Importante:** o CRUD de relatórios (`GET /api/relatorios`, `POST`, `PUT`, `DELETE`) **NÃO** vai pro FastAPI. Metadados (relatório, parâmetros, colunas, layout, execuções) ficam no Lovable Cloud e o frontend acessa diretamente via `supabase` client com RLS de admin.
>
> O FastAPI é responsável **apenas pela execução SQL contra o ERP** e exportações.

## Endpoints

### `POST /api/relatorios/validar-sql`

Valida sintaxe e segurança da SQL. Bloqueia DML/DDL.

```json
// Request
{ "sql": "SELECT * FROM tbl WHERE cod_emp = :cod_emp" }

// Response 200
{
  "valido": true,
  "parametros": ["cod_emp"],
  "colunas": [{ "nome": "col1", "tipo": "varchar" }]
}

// Response 200 (inválida)
{ "valido": false, "erro": "sintaxe inválida próximo a ..." }
```

Implementação sugerida:
- Regex de bloqueio: `\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge)\b`.
- `EXPLAIN` parametrizado para validar sintaxe sem executar.
- Retornar lista de parâmetros nomeados detectados (regex `(?<!:):([a-z_]\w*)`).

### `POST /api/relatorios/preview`

Executa a SQL em modo preview com **LIMIT 100** automático.

```json
// Request
{
  "sql": "SELECT * FROM tbl WHERE cod_emp = :cod_emp",
  "parametros": { "cod_emp": 1 },
  "limite": 100
}

// Response 200
{
  "colunas": [{ "nome": "col1", "tipo": "varchar" }],
  "linhas": [{ "col1": "valor" }],
  "qtd_linhas": 42,
  "tempo_ms": 123
}
```

Regras:
- Aplicar `LIMIT 100` (ou wrap `SELECT * FROM (...) LIMIT 100`).
- Timeout de 10s.
- Mesma validação de DML do endpoint anterior.
- Retornar erro 400 com `{ "erro": "..." }` se a SQL falhar (frontend exibe).

### `POST /api/relatorios/{id}/executar`

Busca a SQL **do Cloud usando service role**, executa no ERP sem limite (ou com limite configurável), grava execução em `relatorio_execucoes` (opcional, frontend também grava), retorna o resultado.

```json
// Request
{ "parametros": { "cod_emp": 1, "data_ini": "2026-01-01" } }

// Response: mesmo shape do /preview, sem LIMIT 100.
```

### `POST /api/relatorios/{id}/exportar/{formato}`

`formato` ∈ `excel | csv | pdf`. Retorna stream binário com `Content-Disposition: attachment`.

```json
// Request
{ "parametros": { ... } }
```

Cabeçalhos:
- Excel: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- CSV: `Content-Type: text/csv`
- PDF: `Content-Type: application/pdf`

A configuração de colunas (`titulo`, `formato`, `alinhamento`, `totalizar`, `agrupar`) deve ser buscada do Cloud e aplicada na exportação.

## Tabelas do Lovable Cloud (referência)

- `relatorios`, `relatorio_parametros`, `relatorio_colunas`, `relatorio_layout`, `relatorio_execucoes`
- RLS exige `is_admin(auth.uid())` para mutações. Service role do backend ignora RLS.

## Variáveis de ambiente

```bash
SUPABASE_URL=https://cpgyhjqufxeweyswosuw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # já configurado em Lovable Cloud
ERP_CONN_STRING=...              # conexão Oracle/Postgres do ERP
```

## CORS

Liberar origens de preview Lovable + domínios publicados conforme padrão atual do projeto.

## Header obrigatório

Como o backend roda via ngrok, todas as requisições do frontend incluem:

```
ngrok-skip-browser-warning: true
```

## Segunda Onda — Aditivos

### `PUT /api/relatorios/{id}/colunas` (contrato conceitual)

Salva a configuração de colunas. No frontend isto é feito direto no Lovable Cloud via `saveColunas`. Documentado para futura migração caso o FastAPI passe a centralizar.

```json
{
  "colunas_config": [
    { "campo": "col1", "titulo": "Coluna 1", "visivel": true, "ordem": 0,
      "tipo": "moeda", "formato": null, "alinhamento": "direita",
      "largura": 120, "totalizar": true, "agrupar": false }
  ]
}
```

### `GET /api/relatorios/{id}/execucoes` (contrato conceitual)

Lista as últimas execuções de um relatório. Hoje no frontend: `listExecucoesPorRelatorio` (Cloud).

### Exportações — `Content-Disposition`

`POST /api/relatorios/{id}/exportar/{excel|csv}` deve responder com header:

```
Content-Disposition: attachment; filename="codigo_relatorio_2026-05-20.xlsx"
```

O frontend extrai o `filename` e usa no download. Fallback: `{codigo}.{ext}`.

A coluna `tipo` aceita: `texto | numero | moeda | data | data_hora | percentual`. A exportação deve aplicar `titulo`, `alinhamento`, `formato`, `largura` e gerar uma linha de TOTAL com soma das colunas `totalizar=true`.

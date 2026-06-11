# Backend — Impressão de OP em lote (POST por seleção)

Complementa `docs/backend-impressao-ordem-producao.md`. Cria uma variante **POST**
do endpoint de lote para suportar **seleção explícita de OPs no frontend** (ex.:
244 OPs marcadas individualmente na tela `/producao/impressao-op`).

Motivação: o GET atual (`/impressao/lote`) só aceita filtros por origem / pedido /
relatório / CR. Quando o usuário escolhe manualmente uma lista arbitrária de OPs,
o frontend é forçado a disparar N requests GET unitários — o que estoura limites
do reverse proxy (ngrok) e gera `Failed to fetch`.

## Rota

```
POST /api/producao/ordem-producao/impressao/lote
```

## Request body

```json
{
  "ops": [
    { "codemp": 1, "codori": "240", "numorp": 10171 },
    { "codemp": 1, "codori": "240", "numorp": 10172 }
  ],
  "incluir_componentes": true,
  "incluir_operacoes": true,
  "incluir_desenhos": true,
  "quebrar_por_operacao": false,
  "modo": "preview"
}
```

Campos:

| Campo                  | Tipo            | Obrigatório | Observação                                                       |
|------------------------|-----------------|-------------|------------------------------------------------------------------|
| `ops`                  | array           | sim         | Máx 30 itens por chamada (frontend já pagina).                   |
| `ops[].codemp`         | int             | sim         | Empresa.                                                         |
| `ops[].codori`         | string          | sim         | Origem (rejeitar `100`).                                         |
| `ops[].numorp`         | int             | sim         | Número da OP.                                                    |
| `incluir_componentes`  | bool            | não (true)  | Equivale a `listar_componentes=S`.                               |
| `incluir_operacoes`    | bool            | não (true)  | Sempre retornar operações.                                       |
| `incluir_desenhos`     | bool            | não (false) | Inclui bloco `desenhos[]` (mesma spec da rota unitária).         |
| `quebrar_por_operacao` | bool            | não (false) | Mesma semântica do parâmetro existente.                          |
| `modo`                 | enum            | não         | `preview` (default), `batch`, `pdf` (binário — ver abaixo).      |

## Response (modo `preview` / `batch`)

Mesmo contrato do GET `/impressao/lote`:

```json
{
  "quantidade_ops": 2,
  "ordens": [ { /* OpImpressao */ }, { /* OpImpressao */ } ]
}
```

Regras:

- Ignorar (não retornar nem falhar) OPs com `sit_orp = 'C'` ou `codori = '100'`.
- Cada item de `ordens` segue exatamente `OpImpressao` (cabeçalho, componentes,
  operações, observações, desenhos).
- Preservar a ordem do array `ops` enviado.
- Em caso de OP inexistente, omitir do array e devolver `falhas[]` opcional:

```json
{
  "quantidade_ops": 1,
  "ordens": [ /* ... */ ],
  "falhas": [ { "codemp": 1, "codori": "240", "numorp": 99999, "motivo": "OP não encontrada" } ]
}
```

## Response (modo `pdf`)

Devolver `application/pdf` binário já renderizado server-side (uma OP por
página/folha). Headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="ops-impressao.pdf"
```

Caso o backend ainda não tenha renderização server-side, manter `modo=pdf`
retornando o mesmo JSON de `preview` — o frontend então usa `window.print()`
sobre o lote completo.

## Erros

- `400` — `ops` vazio ou maior que 30.
- `422` — algum item sem `codemp`/`codori`/`numorp` ou com `codori = '100'`.
- `500` — erro inesperado.

**Importante:** nunca devolver `NameError`/traceback Python cru em `detail`.
Encapsular como `{ "detail": "Falha ao gerar impressão em lote." }` e logar
o erro real no servidor.

## Como o frontend usa

- Helper: `fetchImpressaoLotePost` em `src/lib/producao/opImpressaoLote.ts`.
- Tela: `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
  - Seleção ≤ 30 → 1 chamada POST com todos os itens.
  - Seleção > 30 → diálogo com 3 opções (visualizar 30, lotes de 30, PDF
    completo); cada lote vira 1 POST.
- Enquanto a rota POST não estiver publicada, o frontend cai em fallback:
  loop GET `/impressao` unitário com concorrência 6, limitado ao lote ativo.

## Diagnóstico

A causa real é diferente da hipótese inicial: **não existe coluna `codigo_acao`** em `public.etl_acoes`. O identificador textual da ação é a coluna `id_acao` (tipo `text`, não `bigint`):

```
id (uuid) | id_acao (text) | nome_acao (text) | ordem (int) | ...
75de7523… | ATU_CONTABILIDADE        | Finalização contabilidade | 99
c7cdc45b… | ETL_V_BALANCO_PATRIMONIAL| Balanço patrimonial       | 3
5a48e1ad… | VM_LANC_CONTABIL         | Lançamentos contábeis     | 2
29a4e9f4… | VM_ORC_DRE               | Orçamento DRE             | 1
```

O frontend **já envia o valor correto** (`r.id_acao`, ex.: `ETL_V_BALANCO_PATRIMONIAL`) em `executarAcao(idAcao, payload)` → `POST /api/etl/acoes/{acao_ref}/executar`. Nenhuma tela manda label composto, nome ou descrição. Conferido em `EtlTarefaDetalhePage.tsx`, `ExecutarModal.tsx`, `EditarSqlModal.tsx`.

Logo, o erro `"Ação ETL não encontrada: ETL_V_BALANCO_PATRIMONIAL"` é **100% no backend FastAPI** — o resolver provavelmente está fazendo `WHERE id::text = :ref` ou tentando casar `id_acao` como número. **Nada precisa mudar no frontend nem no Supabase.**

## Plano

Atualizar somente a documentação de contrato consumida pelo time da FastAPI, deixando explícito o resolver correto e os endpoints afetados. Nenhuma migração, nenhuma alteração de código React.

### 1. `docs/backend-etl-central.md` (ou criar `docs/backend-etl-resolver-acao.md` se a seção não existir)

Adicionar seção **"Resolução de `{acao_ref}`"** com a regra única usada por todos os endpoints `/api/etl/acoes/{acao_ref}/...`:

```
def resolver_acao(acao_ref: str) -> EtlAcao:
    ref = acao_ref.strip()
    # 1) UUID exato
    if is_uuid(ref):
        row = db.fetch_one("SELECT * FROM public.etl_acoes WHERE id = :id", id=ref)
        if row: return row
    # 2) id_acao textual (case-insensitive)
    row = db.fetch_one(
        "SELECT * FROM public.etl_acoes WHERE upper(id_acao) = upper(:ref)",
        ref=ref,
    )
    if row: return row
    raise HTTPException(404, f"Ação ETL não encontrada: {acao_ref}")
```

Regras explícitas a documentar:

- `etl_acoes.id` é `uuid`; `etl_acoes.id_acao` é `text` (NÃO bigint).
- **Não existe** coluna `codigo_acao` — qualquer referência no backend deve ser removida.
- Comparar `id_acao` **somente como texto**, sempre com `upper()` dos dois lados.
- Nunca casar por `nome_acao`, `descricao` ou labels compostos.

### 2. Endpoints que devem usar o mesmo resolver

Listar no doc, reforçando:

```
POST  /api/etl/acoes/{acao_ref}/executar
GET   /api/etl/acoes/{acao_ref}/comando-sql
PATCH /api/etl/acoes/{acao_ref}/comando-sql
POST  /api/etl/acoes/{acao_ref}/testar-sql
```

`acao_ref` aceita: UUID (`id`) **ou** texto (`id_acao`, ex.: `VM_ORC_DRE`, `VM_LANC_CONTABIL`, `ETL_V_BALANCO_PATRIMONIAL`, `ATU_CONTABILIDADE`).

### 3. `docs/backend-etl-contabilidade.md`

Atualizar a frase final ("`acao_ref` aceita o `id_acao` (texto) ou o `id` (uuid)") para apontar para a nova seção do resolver e incluir um teste rápido `curl` por ação contábil, para o time da FastAPI validar o fix.

### Fora de escopo (intencional)

- Frontend (`src/components/etl/ExecutarModal.tsx`, `EtlTarefaDetalhePage.tsx`): já envia `id_acao` textual correto.
- Migração: não há alteração de schema.
- `src/integrations/supabase/*`: auto-gerado, não tocar.

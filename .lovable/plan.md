## Objetivo

Atualizar a especificação do endpoint temporário `GET /api/bi/contabilidade/teste-rpc-dre` (em `docs/backend-bi-contabilidade-teste-rpc-dre.md`) para isolar de vez se o 502 está na **chamada da RPC** ou na **montagem da matriz** feita pelo `/dre-matriz`.

O endpoint deve ser o mais burro possível: chama a RPC, devolve o JSON cru, e só. Sem orçamento, sem matriz, sem AV, sem linhas sintéticas.

## Mudanças na spec

### 1. SQL executado

Trocar a chamada atual (`'202601' / '202606'`, named params) por exatamente:

```sql
SELECT codigo_linha, anomes_referente, vl_realizado
FROM public.rpc_bi_dre_realizado_regras('202601', '202612')
ORDER BY codigo_linha, anomes_referente;
```

- Período fixo `202601` → `202612` (igual ao que o usuário já validou direto no Postgres).
- Argumentos **posicionais**, idênticos ao SELECT validado — sem `p_anomes_ini =>` / `p_anomes_fim =>`, sem `%(...)s` nomeado. Se o driver exigir bind, usar `%s, %s` com tupla `('202601','202612')`.
- Sem `WHERE`, sem `LIMIT`, sem joins, sem `bi_vm_orc_dre`, sem `bi_dre_estrutura`.

### 2. Resposta

`200 OK` devolvendo o array cru da RPC, na mesma ordem do `ORDER BY`:

```json
{
  "periodo": { "ini": "202601", "fim": "202612" },
  "total_linhas": 312,
  "linhas": [
    { "codigo_linha": "DEPRECIACAO", "anomes_referente": "202601", "vl_realizado": -1234.56 },
    ...
  ]
}
```

- Converter `vl_realizado` (`numeric` → `Decimal`) para `float` antes de serializar.
- Não pivotar por mês, não agrupar, não calcular total, não calcular AV, não preencher linhas sintéticas.

### 3. Tratamento de erro (obrigatório, antes de qualquer outra coisa)

```python
import traceback
from fastapi import HTTPException

try:
    rows = pg.fetch(SQL)  # SELECT ... rpc_bi_dre_realizado_regras('202601','202612')
    ...
except Exception as e:
    print("[ERRO TESTE-RPC-DRE]", repr(e))
    traceback.print_exc()
    raise HTTPException(status_code=502, detail=str(e))
```

- `detail=str(e)` no 502 (não devolver string genérica).
- `traceback.print_exc()` para o stdout do uvicorn.

### 4. Proibições explícitas (reforçar no doc)

Não pode aparecer no handler:
- `bi_vm_orc_dre`, `bi_dre_estrutura`, qualquer outra tabela.
- Pivot por mês / construção de matriz.
- Cálculo de AV, % ou totais.
- Linhas sintéticas / agrupamentos pai.
- Cache, autenticação adicional, parâmetros de query.

### 5. Critério de validação

- `200` com `linhas` não vazio → a RPC funciona via FastAPI; o bug do `/dre-matriz` está **na montagem da matriz** (pivot, orçamento, AV, sintéticas, serialização de Decimal em outro campo).
- `502` com `detail` preenchido → o bug está **na chamada da RPC** (nome do parâmetro, driver, search_path, permissão, cast). O `detail` + traceback no stdout apontam exatamente onde.

### 6. Ciclo de vida

Endpoint **temporário de diagnóstico**. Remover assim que `/api/bi/contabilidade/dre-matriz` voltar a responder `200`. Manter a anotação `# TEMP DIAG — remover após corrigir /dre-matriz` no handler.

## Arquivos afetados

- `docs/backend-bi-contabilidade-teste-rpc-dre.md` — reescrever as seções "SQL/Chamada da RPC", "Resposta" e "Critério de validação" conforme acima.
- `.lovable/plan.md` — registrar esta iteração.

Nenhuma alteração no frontend, no Cloud, nem no `/dre-matriz` nesta rodada.

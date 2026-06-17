## Objetivo

Adicionar à spec `docs/backend-bi-contabilidade-dre-matriz.md` uma instrução de **diagnóstico obrigatório**: o handler do endpoint deve logar o traceback completo da exceção e expor a mensagem real no `detail` do 502, em vez de mascarar com "Erro ao carregar DRE".

## Mudança no documento

Nova seção curta **"Tratamento de erros / Diagnóstico (obrigatório)"** logo antes de `### Erros`, com o trecho exato a aplicar no FastAPI:

````markdown
## Tratamento de erros / Diagnóstico (obrigatório)

Enquanto o 502 persistir, o handler **deve** logar o traceback completo e devolver a mensagem real da exceção no `detail`. Proibido mascarar com strings genéricas como `"Erro ao carregar DRE"`.

```python
import traceback
from fastapi import HTTPException

@router.get("/api/bi/contabilidade/dre-matriz")
def dre_matriz(ano: str, unidade: str | None = None):
    try:
        ...  # chamada à RPC + montagem da matriz
    except Exception as e:
        print("[ERRO DRE MATRIZ]", repr(e))
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(e))
```

Requisitos:

- `print(..., flush=True)` ou logger equivalente, para aparecer no stdout do uvicorn.
- `detail=str(e)` (não usar mensagem fixa) — o front já exibe `detail`/`message`.
- Manter esse logging permanentemente (mesmo após estabilizar): apenas o `detail` pode ser sanitizado depois, o `traceback.print_exc()` continua.
````

Também atualizar a subseção `### Erros` para refletir que `detail` agora carrega o erro real do Python/SQL.

## Arquivo alterado

- `docs/backend-bi-contabilidade-dre-matriz.md` (apenas documentação).

## Fora de escopo

- Frontend — `DrePage.tsx` já exibe `detail`/`message` quando presentes; nada a mudar.
- Lovable Cloud — nenhuma alteração.

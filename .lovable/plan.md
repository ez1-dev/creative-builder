## Objetivo

Criar a spec de um endpoint **temporário de diagnóstico** que apenas executa `public.rpc_bi_dre_realizado_regras('202601','202606')` e devolve o resultado bruto, sem orçamento, matriz, linhas sintéticas ou AV. Serve para isolar se o FastAPI consegue chamar a RPC.

## Mudança

Criar novo arquivo `docs/backend-bi-contabilidade-teste-rpc-dre.md` com a spec completa do endpoint:

- **Rota:** `GET /api/bi/contabilidade/teste-rpc-dre`
- **Sem parâmetros** (período fixo `202601`–`202606`).
- **Sem auth extra** além do já usado pelos outros `/api/bi/*`.
- **Body do handler:**

  ````python
  import traceback
  from fastapi import HTTPException

  @router.get("/api/bi/contabilidade/teste-rpc-dre")
  def teste_rpc_dre():
      try:
          rows = pg.fetch(
              "SELECT codigo_linha, anomes_referente, vl_realizado "
              "FROM public.rpc_bi_dre_realizado_regras(%(ini)s, %(fim)s)",
              {"ini": "202601", "fim": "202606"},
          )
          return rows
      except Exception as e:
          print("[ERRO TESTE RPC DRE]", repr(e), flush=True)
          traceback.print_exc()
          raise HTTPException(status_code=502, detail=str(e))
  ````

- **Response:** array JSON bruto, exatamente como a RPC devolve:

  ```json
  [
    { "codigo_linha": "DEPRECIACAO",              "anomes_referente": "202601", "vl_realizado": -123456.78 },
    { "codigo_linha": "DESPESAS_ADMINISTRATIVAS", "anomes_referente": "202601", "vl_realizado": -234567.89 }
  ]
  ```

- **Proibições:**
  - Não juntar com `bi_vm_orc_dre`.
  - Não juntar com `bi_dre_estrutura`.
  - Não pivotar por mês.
  - Não calcular AV.
  - Não criar linhas sintéticas / totalizadoras.
  - Não montar SQL inline contra `bi_vm_lanc_contabil`.

- **Status:** marcar explicitamente como **temporário / diagnóstico** — remover assim que o endpoint `/api/bi/contabilidade/dre-matriz` estabilizar.

- **CORS:** liberar a mesma origem do preview Lovable que os demais `/api/bi/*`.

## Arquivos alterados

- novo: `docs/backend-bi-contabilidade-teste-rpc-dre.md`

## Fora de escopo

- Frontend — nenhuma tela consome este endpoint; será testado direto via `curl` / DevTools.
- Lovable Cloud — nenhuma alteração.

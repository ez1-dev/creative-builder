## Objetivo

A spec `docs/backend-bi-contabilidade-dre-matriz.md` já foi atualizada na rodada anterior para instruir o FastAPI a chamar `public.rpc_bi_dre_realizado_regras(p_anomes_ini, p_anomes_fim)` e agrupar por `codigo_linha` × `anomes_referente`. Este ajuste reforça e fecha a documentação para que o backend implemente exatamente esse fluxo.

## Mudanças no documento

1. **Topo do arquivo** — adicionar nota de implementação em destaque:
   > O endpoint **deve** obter o realizado exclusivamente via `SELECT * FROM public.rpc_bi_dre_realizado_regras(:ini, :fim)`. Proibido SQL inline contra `bi_vm_lanc_contabil` no Python, proibido qualquer outra RPC.

2. **Nova subseção "Contrato da RPC consumida"** logo antes do pseudocódigo:
   - Assinatura: `public.rpc_bi_dre_realizado_regras(p_anomes_ini text, p_anomes_fim text)`.
   - Retorno: linhas `(codigo_linha text, anomes_referente text, vl_realizado numeric)` já agrupadas por `codigo_linha × anomes_referente` com `sinal` aplicado.
   - Mapeamento de `ano` → `p_anomes_ini = '<ano>01'`, `p_anomes_fim = '<ano>12'`.
   - `anomes_referente` retornado é texto `YYYYMM`; mês = `int(anomes[-2:])`.

3. **Pseudocódigo FastAPI** — substituir o trecho atual por versão completa e direta:
   ```python
   @router.get("/api/bi/contabilidade/dre-matriz")
   def dre_matriz(ano: str, unidade: str | None = None):
       p_ini, p_fim = f"{ano}01", f"{ano}12"
       realizado = pg.fetch(
           "SELECT codigo_linha, anomes_referente, vl_realizado "
           "FROM public.rpc_bi_dre_realizado_regras(%(ini)s, %(fim)s)",
           {"ini": p_ini, "fim": p_fim},
       )
       # pivotar por (codigo_linha, mes=int(anomes_referente[-2:]))
       # juntar com bi_vm_orc_dre (orcado) e bi_dre_estrutura (ordem/desc/nivel/totalizadora)
       # calcular A.V. contra Receita Líquida
       return montar_matriz_anual(realizado, orcado, estrutura)
   ```

4. **Reforçar "Proibições"** — incluir item explícito: "Não montar SQL inline contra `bi_vm_lanc_contabil` no Python; o realizado vem exclusivamente da RPC."

5. **Manter** intactos: contrato HTTP de resposta, valores validados de sanity check, SQL do orçamento, lista de colunas usadas, TODO de `p_unidade`.

## Arquivo alterado

- `docs/backend-bi-contabilidade-dre-matriz.md` (apenas documentação).

## Fora de escopo

- Frontend `DrePage.tsx` — contrato HTTP preservado, sem mudanças.
- Lovable Cloud — a RPC vive no Postgres do FastAPI; nenhuma migração no Cloud.

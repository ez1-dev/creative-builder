## Status
O fix solicitado já foi aplicado no turno anterior em `src/lib/bi/dreMontadorApi.ts` e `src/pages/bi/contabilidade/DreMontadorPage.tsx`. Validando contra os 6 requisitos:

1. Leitura prioritária de `conta.centros_custo` — OK (`coerceCentrosCusto(r?.centros_custo)` é a primeira tentativa).
2. `JSON.parse` quando vier string — OK (helper trata `typeof raw === 'string'` com `try/catch`).
3. `null`/`undefined` viram `[]` — OK.
4. Aliases (`ccu`, `centroscusto`, etc.) só são usados como fallback, nunca substituindo o array principal — OK.
5. Array preenchido não é descartado — OK (sem `&&` que zera tudo).
6. Normalização por centro com `cd_centro_custos_3 || cd.slice(0,3)`, `valor_total ?? vl_realizado ?? 0`, `vl_realizado ?? valor_total ?? 0`, `ds_centro_custos` — OK.

Logs `[MONTADOR DRE]` também já mostram `typeof`, length e primeiro centro. O banner âmbar só dispara quando `mapped.every(m => m.centros_custo.length === 0)`.

## Plano proposto
Como o pedido atual é idêntico ao que já está em código, nenhuma alteração adicional de implementação é necessária.

**Etapas:**
1. Após aprovar este plano, abrir `/bi/contabilidade/dre-montador`, carregar com `anomes_ini=202601&anomes_fim=202601` e verificar no console:
   - `[MONTADOR DRE] typeof centros_custo (raw):` → deve ser `object` ou `string`.
   - `[MONTADOR DRE] mapped[0].centros_custo length:` → deve ser > 0 em pelo menos uma conta.
2. Expandir a conta `311020006` e confirmar `centros_custo.length = 17`.
3. Se algum requisito falhar (ex.: backend mandando chave diferente), aplicar ajuste pontual no mapper.

**Sem mudanças de arquivo neste momento** — caso o usuário esteja vendo cache antigo, basta dar refresh. Se reproduzir falha mesmo após refresh, envie o print do console com as linhas `[MONTADOR DRE]` para eu identificar onde o contrato divergiu.
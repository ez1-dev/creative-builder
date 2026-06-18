## Problema

A tela `/bi/contabilidade/dre-montador` está mostrando `valor_total = 0` em todas as contas retornadas por `GET /api/bi/contabilidade/dre-dinamica/plano-contas`. O log `[MONTADOR DRE] backend retornou valor_total = 0 em todos os itens` confirma que o problema está no backend (FastAPI), não no mapeamento do frontend — o front já aceita aliases (`total`, `valor`, `vl_saldo`, `saldo`) e ainda assim vem zero.

## Diagnóstico esperado no backend

O endpoint precisa agregar `bi_vm_lanc_contabil` no período `[anomes_ini, anomes_fim]` recebido. Hipóteses prováveis de por que `valor_total` está zerado:

1. **Filtro de período não aplicado** — query roda sem `WHERE anomes_referente BETWEEN :ini AND :fim`, ou usa `=` em vez de `BETWEEN`, ou compara string com inteiro (`'202601'` vs `202601`).
2. **Coluna errada na soma** — somando `vl_debito - vl_credito` quando o correto é `vl_saldo` (ou vice-versa), ou somando coluna que está sempre `NULL`/`0` no período.
3. **JOIN derrubando linhas** — `INNER JOIN` com plano de contas Senior remove contas sem cadastro, zerando o agregado.
4. **GROUP BY em coluna errada** — agregando por `cd_conta` mas devolvendo `mascara` de outra linha, fazendo a soma cair em buckets vazios.
5. **Parâmetros do path** — `anomes_ini`/`anomes_fim` chegam como `None` na função Python e a query roda com `BETWEEN NULL AND NULL` → retorna 0.

## Plano

1. Verificar o smoke-test SQL no Cloud para confirmar que existe movimento em `202601`:
   ```sql
   SELECT count(*), sum(vl_saldo)
   FROM bi_vm_lanc_contabil
   WHERE anomes_referente BETWEEN 202601 AND 202601;
   ```
   Se vier `> 0` aqui, o dado existe e o problema é 100% no endpoint FastAPI.

2. Atualizar `docs/backend-bi-contabilidade-dre-dinamica-montador.md` com uma seção nova **"Checklist quando `valor_total` vem 0"**, espelhando o checklist que já existe para `centros_custo` vazio. Itens:
   - confirmar `WHERE anomes_referente BETWEEN :ini AND :fim` (inteiros, não strings);
   - confirmar coluna somada (`sum(vl_saldo)` ou `sum(coalesce(vl_credito,0) - coalesce(vl_debito,0))`);
   - confirmar `LEFT JOIN` no plano de contas;
   - confirmar que `anomes_ini`/`anomes_fim` chegam preenchidos no handler (logar no FastAPI);
   - smoke-test SQL acima;
   - resposta mínima válida com `valor_total != 0`.

3. No frontend (`src/lib/bi/dreMontadorApi.ts`), reforçar o aviso quando `valor_total === 0` em todos os itens: incluir no `console.warn` a URL chamada e o período enviado, para facilitar o diagnóstico ("verifique se o endpoint agrega `bi_vm_lanc_contabil` no período `anomes_ini=... anomes_fim=...`"). Não mexer no mapper — os aliases já estão corretos.

## Critério de aceite

- `docs/backend-bi-contabilidade-dre-dinamica-montador.md` tem a nova seção de troubleshooting para `valor_total = 0`.
- Console do frontend, ao detectar todos os valores zerados, mostra explicitamente o período enviado e a URL chamada, junto com a lista de causas prováveis no backend.
- Nenhuma alteração de lógica de mapeamento — apenas diagnóstico.

## Pergunta antes de implementar

Você quer que eu rode o smoke-test SQL no banco agora (via read_query) para confirmar se existe movimento em `bi_vm_lanc_contabil` no período `202601`? Isso prova de imediato se o problema é "não há dado" vs "endpoint não agrega".

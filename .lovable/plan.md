## Contexto

O `usuario_origem` do drill `/api/contabil/drill-lancamentos` só vem correto quando o backend FastAPI extrair a NF do `CPLLCT` e resolver o usuário via `E140NFV.USUGER`. O frontend (`DrillDrawer.tsx`) já trata `usuario_origem`, `usuario_lancamento` e `usuario_origem_difere` corretamente — nada a mudar na UI.

Como o backend FastAPI vive fora deste repositório Lovable, esta tarefa se materializa aqui como **uma spec formal para o time de backend**, no mesmo padrão dos outros `docs/backend-*.md` do projeto.

## Entregável neste repo

Criar `docs/backend-drill-lancamentos-usuario-origem-ven.md` contendo, na íntegra, a especificação enviada pelo usuário:

1. **Problema confirmado** — para `origem_codigo = VEN`, backend hoje devolve só `E640LCT.CODUSU`; o operacional correto é `E140NFV.USUGER`.
2. **Exemplo validado** — Lote 12932 / Lcto 1301707160 / NF 20567 → `agendador` (84) vs `yasmin.rodrigues` (302); JSON esperado.
3. **SQL** — bloco `OUTER APPLY` para extrair `NUMNFV` de `CPLLCT`, `LEFT JOIN E140NFV` por `CODEMP+CODFIL+NUMLOT+NUMNFV` (nunca só por lote), `LEFT JOIN R999USU` para lançamento e origem, e colunas novas: `usuario_lancamento_codigo`, `usuario_lancamento`, `usuario_origem_codigo`, `usuario_origem`, `documento_origem`, `usuario_origem_fonte`, `usuario_origem_difere` (BIT).
4. **Pós-processamento Python** — compara **códigos** e não nomes; preserva `item["usuario"] = usuario_lancamento` p/ compat.
5. **Regras proibidas** — sem fallback `usuario_origem = usuario_lancamento`, sem `E640LOT.USULOT`, sem esconder quando iguais.
6. **Ambiguidade** — múltiplas `E140NFV` ⇒ devolver `usuario_origem = null` e `usuario_origem_status = "AMBIGUO"` (nunca `TOP 1`).
7. **Escopo** — apenas `VEN`; REC/EST/MAN/PAT ficam para depois; não alterar auth, CORS, paginação, filtros nem UI.
8. **Critérios de aceite** — Casos 1 (NF 20567 → yasmin) e 2 (NF 20568 → joao.santos) no mesmo lote 12932.
9. **Follow-up esperado do backend** — arquivo/função alterados, SQL final, trecho Python, JSON dos dois casos e confirmação de que nada mais foi mexido.

## Frontend

Nenhuma mudança. `src/components/dre-studio/DrillDrawer.tsx` e `src/lib/contabil/drillLancamentosApi.ts` já consomem `usuario_origem`, `usuario_lancamento`, `usuario_origem_codigo`, `usuario_origem_difere` com campos separados e realce âmbar — assim que o backend passar a popular `E140NFV.USUGER`, o realce e a coluna "Usuário Origem" ficam corretos automaticamente para VEN.

Também vou anexar uma nota curta em `.lovable/plan.md` (ou substituir seu conteúdo) apontando para o novo doc, para o próximo agente saber que a bola está com o backend.

## Fora de escopo

- Qualquer edição em `DrillDrawer.tsx`, hooks de drill, tipos, `contabilApi`.
- Regras para REC/EST/MAN/PAT.
- Alterações em auth, CORS, cálculo contábil, paginação, filtros.

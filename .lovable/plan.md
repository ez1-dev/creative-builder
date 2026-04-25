# Teste automatizado — rateios do título 975462S-1 no modo árvore

## Objetivo

Travar via testes o contrato esperado para o título **975462S-1** no endpoint `/api/contas-pagar-arvore` e o comportamento do `FinanceiroTreeTable` quando o backend retorna (ou não) linhas `tipo_linha = "RATEIO"`. Assim, quando o backend FastAPI for corrigido (ver `docs/backend-contas-centro-custo-projeto.md`), o teste de contrato passa automaticamente; enquanto isso, o teste de UI garante que o aviso "sem rateios cadastrados" aparece.

## O que será adicionado

### 1. Teste de contrato do endpoint (`src/lib/__tests__/contas-pagar-arvore.contract.test.ts`)

Mocka `fetch` e valida o shape da resposta de `/api/contas-pagar-arvore?numero_titulo=975462S-1`:

- Cenário A — **estado atual (regressão conhecida)**: backend devolve só TÍTULO, `possui_filhos=false`. Marcado como `it.skip` com comentário linkando para o doc backend, para servir como TODO até o fix.
- Cenário B — **estado esperado pós-fix**: resposta contém 1 linha `TITULO` com `possui_filhos=true` + N linhas com `tipo_linha="RATEIO"`, `codigo_pai` apontando para o `id_linha` do título, `nivel=1`, `codigo_centro_custo` preenchido, e soma de `percentual_rateio` = 100. Esse é o teste ativo, usando fixture mockada — passa hoje (valida o consumidor) e continuará passando quando o backend real responder o mesmo shape.

Também testa `flattenArvore` + `construirMapaFilhos` de `src/lib/treeFinanceiro.ts` com a fixture: ao expandir o título, as linhas RATEIO aparecem na ordem correta abaixo do pai.

### 2. Teste de UI do `FinanceiroTreeTable` (`src/components/erp/__tests__/FinanceiroTreeTable.test.tsx`)

Render com Testing Library, dois casos:

- **Com rateios**: passa a fixture do cenário B. Verifica que (a) o título renderiza com chevron expansível, (b) após `onToggle`, as linhas RATEIO ficam visíveis com CCU, % e valor rateado formatados, (c) o aviso "sem rateios cadastrados" **não** aparece.
- **Sem rateios** (estado atual do backend para 975462S-1): passa só a linha TÍTULO com `possui_filhos=false`. Verifica que o aviso "sem rateios cadastrados" é exibido e que não há botão de expandir.

### 3. Fixture compartilhada (`src/test/fixtures/contasPagarArvore975462S1.ts`)

Exporta `respostaSemRateios` (estado atual do backend) e `respostaComRateios` (estado esperado pós-fix), com pelo menos 2 linhas RATEIO (CCUs distintos somando 100%), para reuso nos dois testes acima.

## Como rodar

`bunx vitest run src/lib/__tests__/contas-pagar-arvore.contract.test.ts src/components/erp/__tests__/FinanceiroTreeTable.test.tsx`

## Observações

- Não há mudanças de produção neste plano — apenas testes e fixtures. O fix real continua sendo backend (já documentado).
- Se quiser, em uma iteração seguinte posso transformar o `it.skip` do cenário A em teste E2E real apontando para a API (via `VITE_API_BASE` em ambiente local), mas isso exige acesso ao backend e fica fora deste plano.

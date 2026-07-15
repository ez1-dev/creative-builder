## Objetivo

No modal **"Lançamento {número}"** aberto a partir do drill do Razão (DRE Studio → Visualização), preencher **todos os campos** que hoje aparecem como "—" (Empresa, Filial, Lado D/C, Conta Débito, Conta Crédito, Centro de custo, Documento, Usuário origem, Valor integral, Valor rateado, etc.).

## Diagnóstico

O modal já **renderiza** todos esses campos (`src/components/dre-studio/DrillDrawer.tsx`, linhas ~460-504). Ele lê do item da linha do razão (`RazaoItem`) que vem do endpoint FastAPI **`GET /api/contabil/drill-lancamentos`**.

Os campos aparecem "—" porque **o backend não está devolvendo essas colunas** hoje — só devolve o essencial usado na tabela do razão (lote, número, data, ctared, conta_descricao, mov_debito, mov_credito, saldo, historico, origem, usuários).

Portanto, "conter todas as informações" exige duas coisas complementares:

1. **Backend (FastAPI)** — enriquecer a resposta de `/api/contabil/drill-lancamentos` com os demais campos do lançamento contábil.
2. **Frontend** — apenas garantir tolerância a nomes/aliases e formatação; a UI já existe.

## Backend — spec de alteração

Endpoint: `GET /api/contabil/drill-lancamentos`

Adicionar as seguintes colunas em cada item de `itens[]` (nomes canônicos que o front já espera em `RazaoItem`):

| Campo | Origem sugerida (Senior E085LAN + E070EMP/E070FIL/E100CTA/E101CCU/E092TAB) |
|---|---|
| `codemp` | E085LAN.CODEMP |
| `codfil` | E085LAN.CODFIL |
| `numero` | E085LAN.NUMLAN (ou já mapeado como `lancamento`) |
| `debcre` | 'D' / 'C' conforme lado do lançamento |
| `conta_debito` | `CODCTA + ' ' + NOMCTA` da conta débito |
| `conta_credito` | `CODCTA + ' ' + NOMCTA` da conta crédito |
| `codccu` | E085LAN.CODCCU |
| `desccu` | E101CCU.NOMCCU |
| `documento` | E085LAN.NUMDOC |
| `usuario_origem` | usuário que gerou (já existe em alguns retornos) |
| `usuario_lancamento` | usuário do lançamento contábil |
| `valor_integral` | valor original do lançamento (antes de rateio por CCU) |
| `valor_rateado` | valor efetivamente atribuído ao CCU quando houver rateio |
| `historico` | E085LAN.HISLAN (limpo, sem aspas duplicadas quando possível) |

Documentar em `docs/backend-dre-api-integrada.md` (ou criar `docs/backend-drill-lancamentos-detalhe.md`) o novo contrato.

## Frontend — ajustes mínimos

Arquivo: `src/lib/contabil/drillLancamentosApi.ts`
- Expandir a interface `DrillLancamentoItem` com os campos acima (apenas tipagem — a UI já usa `RazaoItem` livre).

Arquivo: `src/components/dre-studio/DrillDrawer.tsx`
- Nenhuma mudança estrutural. Confirmar que o mapeamento do item da linha para `detalhe` (setDetalhe) preserva todos os campos novos (hoje ele já espalha o objeto).
- Pequena melhoria de UX: quando `conta_debito` **e** `conta_credito` estiverem preenchidos, destacar em negrito o lado (`debcre`) correspondente.

Arquivo: `src/hooks/contabil/useDrillLancamentos.ts`
- Nada a fazer (apenas repassa o item).

## Observação importante

Como o ETL/consulta real roda no **FastAPI externo (ngrok)**, esta tarefa depende de deploy no backend para os campos ficarem realmente preenchidos. O front fica pronto para exibir assim que o backend enviar. Enquanto o backend não devolver, os campos continuarão mostrando "—" (comportamento correto e seguro).

## Arquivos afetados

- `src/lib/contabil/drillLancamentosApi.ts` (tipagem)
- `src/components/dre-studio/DrillDrawer.tsx` (destaque D/C — opcional)
- `docs/backend-drill-lancamentos-detalhe.md` (novo — contrato para o time de backend)


Verificando se os filtros de centro de custo e projeto estão sendo enviados corretamente para a API.

Olhando o código atual de `ContasReceberPage.tsx` (visível no contexto):

```typescript
const params: any = { ...filters, pagina: page, tamanho_pagina: 100 };
...
if (!params.centro_custo) delete params.centro_custo;
if (!params.projeto) delete params.projeto;
```

Os parâmetros `centro_custo` e `projeto` estão incluídos via spread `...filters` e só são removidos quando vazios — ou seja, quando preenchidos, são enviados para `/api/contas-receber`. O mesmo padrão deve estar em `ContasPagarPage.tsx`.

Preciso confirmar dois pontos:
1. Se `ContasPagarPage.tsx` tem o mesmo tratamento.
2. Se a API backend (`/api/contas-pagar` e `/api/contas-receber`) realmente aceita e aplica esses parâmetros como filtro SQL — isso depende do backend FastAPI, que não está no codebase do frontend.

## Diagnóstico

**Frontend (confirmado)**: Os valores de `centro_custo` e `projeto` digitados nos campos de filtro são enviados como query params para a API quando preenchidos. Quando vazios, são omitidos da requisição.

**Backend**: A aplicação efetiva do filtro depende do endpoint FastAPI no servidor ERP. Como o backend não está neste repositório, não consigo verificar diretamente se o SQL filtra por `cod_ccu` (centro de custo) e `cod_prj` (projeto).

## Como validar

1. Abra Contas a Pagar (ou Receber), preencha **Centro de Custo** com um código conhecido e clique em Pesquisar.
2. Abra o DevTools → aba Network → procure a chamada `/api/contas-pagar` e confirme que `centro_custo=XXX` aparece na query string.
3. Verifique se os resultados retornados realmente correspondem ao centro de custo informado (coluna "C. Custo" da grid).

Se o parâmetro está na URL mas a grid retorna registros de outros centros, o ajuste necessário é no **backend FastAPI** (adicionar o `WHERE` correspondente na query SQL do endpoint).

## Próximo passo sugerido

Se quiser, posso:
- **Verificar o `ContasPagarPage.tsx`** para garantir que o envio dos parâmetros está idêntico ao de Receber.
- **Adicionar log/toast de debug** mostrando os parâmetros enviados, para facilitar a validação.
- **Documentar o contrato esperado** dos endpoints para o time backend ajustar caso o filtro não esteja sendo aplicado no SQL.

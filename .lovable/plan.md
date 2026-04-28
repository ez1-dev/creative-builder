## Diagnóstico

No **Modo árvore de rateio**, os filtros (Data Pagamento Inicial/Final, e provavelmente outros) **não são aplicados ao resultado** — a tela traz mais dados do que o pedido.

Investigando o código (`src/pages/ContasPagarPage.tsx`, função `search`):

- O frontend já mapeia corretamente `data_pagamento_ini/fim` (UI) para `data_movimento_ini/fim` (parâmetros backend) **antes** de decidir qual endpoint chamar.
- Os mesmos `params` são enviados tanto para `/api/contas-pagar` (modo normal) quanto para `/api/contas-pagar-arvore` (modo árvore).
- Ou seja: do lado do frontend, os dois modos enviam exatamente o mesmo conjunto de filtros.

Conferindo a documentação do backend (`docs/backend-export-contas-pagar-arvore.md`, linhas 12-23), os parâmetros oficialmente suportados pelo endpoint árvore são:

```
fornecedor, numero_titulo, tipo_titulo, filial, centro_custo,
numero_projeto/projeto, status_titulo,
data_emissao_ini/fim, data_vencimento_ini/fim
```

**`data_movimento_ini` e `data_movimento_fim` NÃO estão listados** — assim como `valor_min/max`, `somente_vencidos`, `somente_saldo_aberto`, `somente_cheques`, `incluir_pagos/excluir_pagos`. É muito provável que o backend simplesmente ignore esses parâmetros na rota árvore, retornando o conjunto completo.

Conclusão: o problema é **no backend FastAPI**, não no frontend. A rota `/api/contas-pagar-arvore` (e a de exportação) precisa aplicar os mesmos filtros que `/api/contas-pagar`.

## O que vou fazer

Como a correção é no backend (fora do escopo do projeto Lovable), vou **atualizar o documento de especificação** que o time de backend usa e **adicionar uma defesa no frontend** para o usuário não ficar sem aviso enquanto o backend não é corrigido.

### 1. Atualizar `docs/backend-export-contas-pagar-arvore.md`

Adicionar à lista "Query params" (que vale também para `/api/contas-pagar-arvore` segundo o próprio documento):

- `data_movimento_ini`, `data_movimento_fim` (YYYY-MM-DD) — filtra pela data do último movimento financeiro do título (data de pagamento/baixa). Equivale ao filtro "Data Pagamento" da tela.
- `valor_min`, `valor_max` (number)
- `somente_vencidos`, `somente_saldo_aberto`, `somente_cheques` (bool)
- `incluir_pagos` / `excluir_pagos` (bool, mutuamente exclusivos; mesma semântica de `/api/contas-pagar`)

Acrescentar nota explícita: **"O endpoint árvore deve aplicar EXATAMENTE os mesmos filtros que `/api/contas-pagar` antes de montar a hierarquia. Filtros não reconhecidos hoje (notadamente `data_movimento_*`) estão fazendo a árvore retornar registros fora do escopo."**

Atualizar a seção de validação para incluir:

- Filtrar `data_pagamento_ini/fim` no modo árvore deve retornar apenas títulos cuja `data_ultimo_movimento` esteja no intervalo (mesma regra do modo normal).

### 2. Criar `docs/backend-contas-pagar-arvore-filtros.md` (novo)

Documento curto e específico apontando o bug atual: lista os parâmetros que a rota árvore ignora hoje, com exemplo de chamada e resultado esperado vs. observado, para o time de backend ter um ticket claro.

### 3. Defesa no frontend (`src/pages/ContasPagarPage.tsx`)

Adicionar um aviso visual discreto **apenas quando** `modo_arvore` está ativo **e** o usuário preencheu algum dos filtros que o backend árvore ainda não aplica de forma confiável (`data_pagamento_ini/fim`, `valor_min/max`, `somente_*`, `incluir_pagos`):

```
Aviso: alguns filtros (Data Pagamento, Valor, "somente...") podem não
ser aplicados pelo backend no modo árvore. Para resultados garantidos,
desative o "Modo árvore de rateio".
```

Renderizado como um `<Alert variant="default">` logo acima da tabela árvore (não bloqueia, só informa). Some assim que o usuário desativa o modo árvore ou limpa esses filtros.

Nenhuma mudança em chamada de API, nenhum filtro removido, nenhum filtro existente quebrado.

## Critério de aceite

1. Documento de backend lista `data_movimento_ini/fim` (e demais) como parâmetros obrigatórios da rota árvore.
2. Existe documento dedicado descrevendo o bug atual de filtros ignorados.
3. Quando o usuário ativa "Modo árvore" + preenche "Data Pagamento Inicial/Final", aparece aviso explicando a limitação atual.
4. Após o backend corrigir, basta remover o aviso do frontend — nenhuma outra mudança será necessária.

## Fora de escopo

- Alterar a query SQL do FastAPI — depende do time de backend.
- Mudanças em Cloud/Supabase.
- Mudar o comportamento dos endpoints no modo não-árvore (já funciona corretamente após a entrega anterior).
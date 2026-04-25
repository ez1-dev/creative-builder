# Rateios não aparecem para o título 975462S-1 em Contas a Pagar (modo árvore)

## Diagnóstico

O frontend está correto. Inspecionei a chamada feita pelo modo árvore:

```
GET /api/contas-pagar-arvore?numero_titulo=975462S-1&pagina=1&tamanho_pagina=100
```

E o backend respondeu apenas com a linha **TÍTULO**, sem nenhuma linha de RATEIO:

```json
{
  "total_registros": 1,
  "modo_exibicao": "ARVORE",
  "dados": [
    {
      "tipo_linha": "TITULO",
      "id_linha": "1-1-01-975462S-1",
      "numero_titulo": "975462S-1",
      "codigo_fornecedor": 6533,
      "nome_fornecedor": "UNIMED DE SANTOS ...",
      "codigo_centro_custo": "",
      "descricao_centro_custo": "",
      "numero_projeto": 0,
      "valor_original": 118078.49,
      "possui_filhos": false,
      "nivel": 0
    }
  ]
}
```

Como `possui_filhos = false` e nenhum item com `tipo_linha = "RATEIO"` veio na resposta, o `FinanceiroTreeTable` não tem o que expandir — comportamento esperado da UI.

Ou seja: **o problema está no endpoint backend `/api/contas-pagar-arvore`, que não está retornando as linhas de rateio (`E075RAT`) deste título**, mesmo o título tendo rateio cadastrado no ERP Senior.

## O que precisa mudar (backend — fora deste repo)

A correção é no serviço FastAPI que serve `/api/contas-pagar-arvore`. Já está documentada parcialmente em `docs/backend-contas-centro-custo-projeto.md` (seção "Endpoints árvore"). Resumo do ajuste necessário para este caso:

1. Para cada título retornado, executar uma consulta complementar em `E075RAT` filtrando por `cod_emp`, `cod_fil`, `tip_tit`, `num_tit` (chave composta do título).
2. Se houver linhas em `E075RAT`, marcar o título com `possui_filhos = true` e anexar uma linha por rateio com:
   - `tipo_linha: "RATEIO"`
   - `codigo_pai: <id_linha do título>` (ex.: `1-1-01-975462S-1`)
   - `id_linha: <id_linha do título>-RAT-<seq>`
   - `nivel: 1`
   - `codigo_centro_custo: rat.cod_ccu`
   - `descricao_centro_custo: ccu.nom_ccu` (JOIN composto por `cod_emp` + `cod_ccu`)
   - `numero_projeto: rat.cod_prj`
   - `percentual_rateio: rat.per_rat`
   - `valor_rateado: rat.val_rat`
   - `origem_rateio: 'E075RAT'`
3. SQL sugerido (Senior):
   ```sql
   SELECT rat.seq_rat,
          rat.cod_ccu,
          ccu.nom_ccu  AS descricao_centro_custo,
          rat.cod_prj  AS numero_projeto,
          rat.per_rat  AS percentual_rateio,
          rat.val_rat  AS valor_rateado
   FROM   e075rat rat
   LEFT JOIN e550ccu ccu
          ON ccu.cod_emp = rat.cod_emp
         AND ccu.cod_ccu = rat.cod_ccu
   WHERE  rat.cod_emp = :cod_emp
     AND  rat.cod_fil = :cod_fil
     AND  rat.tip_tit = :tip_tit
     AND  rat.num_tit = :num_tit
   ORDER BY rat.seq_rat;
   ```
4. Validação: para o título `975462S-1` (emp=1, fil=1, tip=01) a soma de `per_rat` deve ser 100% e o backend deve passar a retornar `total_registros >= 2` (1 título + N rateios).

## O que muda no frontend deste projeto

Nada. O fluxo de modo árvore, o componente `FinanceiroTreeTable` e o helper `flattenArvore` já lidam corretamente com `tipo_linha = "RATEIO"` + `codigo_pai`. Confirmado lendo:

- `src/pages/ContasPagarPage.tsx` (chamada do endpoint árvore e renderização condicional)
- `src/components/erp/FinanceiroTreeTable.tsx` (render dos níveis)
- `src/lib/treeFinanceiro.ts` (mapa pai→filhos)

## Opcional (melhoria de UX, no frontend)

Posso adicionar um aviso discreto na grid árvore quando um título vem com `possui_filhos = false` em modo árvore, do tipo: *"Sem rateios cadastrados no ERP para este título."* — só para deixar claro ao usuário que não é bug da tela. Sem alterar lógica de dados.

## Próximos passos

Como a causa raiz está no backend FastAPI/Senior (fora deste repositório), preciso saber como prosseguir:

1. Apenas registrar a especificação da correção em `docs/backend-contas-centro-custo-projeto.md` (complementando a seção existente "Centro de custo incorreto nos rateios" com este caso de "rateios ausentes").
2. Adicionar também o aviso visual opcional na tabela árvore quando `possui_filhos = false`.
3. Ambos os itens acima.

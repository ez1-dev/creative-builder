# Contrato Backend — Centro de Custo e Projeto em Contas a Pagar/Receber

## Problema observado

O frontend envia corretamente os parâmetros `centro_custo` e `projeto` nas
requisições para `/api/contas-pagar` e `/api/contas-receber`, mas:

1. A resposta JSON **não inclui** os campos `centro_custo` e `projeto` em cada
   título — por isso as colunas correspondentes na grid aparecem vazias (`-`).
2. O total de registros retornado quando o filtro é aplicado é igual ao total
   geral, sugerindo que o `WHERE` correspondente **não está sendo aplicado**
   no SQL do backend.

## Endpoints afetados

- `GET /api/contas-pagar`
- `GET /api/contas-receber`
- `GET /api/export/contas-pagar`
- `GET /api/export/contas-receber`

## Parâmetros de query esperados

| Parâmetro      | Tipo   | Descrição                                 |
|----------------|--------|-------------------------------------------|
| `centro_custo` | string | Código ou parte do nome do centro de custo |
| `projeto`      | string | Código ou parte do nome do projeto         |

Quando informados, devem aplicar `WHERE` (ou `LIKE`) na query principal.

## Campos esperados na resposta (por item)

Cada registro de `dados[]` deve incluir, além dos campos atuais:

```json
{
  "centro_custo": "663 - PRODUÇÃO",
  "projeto": "P-2024-014 - EXPANSÃO FÁBRICA"
}
```

Quando o título não tiver vínculo, retornar `null` ou string vazia.

## Tabelas Senior prováveis

- **Centro de Custo**: `E550CCU` (cadastro) — vínculo via `cod_ccu` no
  movimento financeiro (`E550MOV` / `E140NFV` / `E440NFC`).
- **Projeto**: `E085PRJ` (cadastro) — vínculo via `cod_prj`.

Sugestão de join (pseudo-SQL):

```sql
SELECT t.*,
       (ccu.cod_ccu || ' - ' || ccu.nom_ccu) AS centro_custo,
       (prj.cod_prj || ' - ' || prj.des_prj) AS projeto
FROM   e550mov t
LEFT JOIN e550ccu ccu ON ccu.cod_emp = t.cod_emp AND ccu.cod_ccu = t.cod_ccu
LEFT JOIN e085prj prj ON prj.cod_emp = t.cod_emp AND prj.cod_prj = t.cod_prj
WHERE  (:centro_custo IS NULL OR t.cod_ccu LIKE :centro_custo || '%')
  AND  (:projeto      IS NULL OR t.cod_prj LIKE :projeto      || '%')
```

## Validação

Após o ajuste:

1. Chamar `/api/contas-pagar?centro_custo=663` e conferir que:
   - Todos os registros retornados possuem `cod_ccu = 663`.
   - O total de registros é menor que o total sem filtro.
2. Conferir na grid do frontend que as colunas **C. Custo** e **Projeto**
   passam a exibir os valores corretos.

## Status no frontend

Nenhuma alteração necessária no frontend — colunas, filtros e parâmetros já
estão implementados em `src/pages/ContasPagarPage.tsx` e
`src/pages/ContasReceberPage.tsx`.

---

## Endpoints árvore (`/api/contas-pagar-arvore` e `/api/contas-receber-arvore`)

### Erro atual observado

```
('42S22', "[Microsoft][ODBC Driver 17 for SQL Server][SQL Server]
 Nome de coluna 'numero_nf' inválido. (207);
 Nome de coluna 'serie_nf' inválido. (207);
 Não foi possível preparar uma ou mais instruções. (8180)")
```

O SQL dos endpoints árvore referencia `numero_nf` e `serie_nf` diretamente
na tabela base de movimentos financeiros (provavelmente `E550MOV`), onde
essas colunas **não existem**.

### Correção esperada no backend

Opção 1 — remover `numero_nf` e `serie_nf` do `SELECT`/`WHERE` se não forem
necessários para a árvore de rateio.

Opção 2 — fazer `LEFT JOIN` com a tabela de NF correspondente:
- Contas a Receber: `E140NFV` (NF de saída)
- Contas a Pagar:   `E440NFC` (NF de entrada)

usando a chave de movimento (`cod_emp`, `cod_fil`, `num_tit`, `tip_tit`,
`cod_cli`/`cod_for`).

### Mitigação aplicada no frontend

Enquanto o SQL não é corrigido, o frontend **remove** os parâmetros
`numero_nf` e `serie_nf` antes de chamar os endpoints árvore. Modos plano
e agrupado continuam enviando esses filtros normalmente.

### Contrato de resposta esperado

Cada item de `dados[]`:

```json
{
  "tipo_linha": "TITULO" | "RATEIO",
  "id_linha": "string",
  "codigo_pai": "string | null",
  "nivel": 0,
  "caminho": "string",
  "possui_filhos": true,
  "descricao_resumida": "string",
  "numero_projeto": "string | null",
  "codigo_fase_projeto": "string | null",
  "codigo_centro_custo": "string | null",
  "descricao_centro_custo": "string | null",
  "percentual_rateio": 0.0,
  "valor_rateado": 0.0,
  "origem_rateio": "string | null",
  "status_titulo": "string | null",
  "data_vencimento": "YYYY-MM-DD | null",
  "valor_original": 0.0,
  "valor_aberto": 0.0,
  "valor_vencido": 0.0
}
```

Já consumido por `src/components/erp/FinanceiroTreeTable.tsx` via
helpers em `src/lib/treeFinanceiro.ts`.

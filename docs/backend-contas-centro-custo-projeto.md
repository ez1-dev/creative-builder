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

O frontend já consome estes endpoints quando o usuário marca **"Modo árvore
de rateio"**. Cada item da resposta deve ter:

- `tipo_linha`: `'TITULO'` (pai) ou `'RATEIO'` (filho)
- `id_linha`: identificador único da linha
- `codigo_pai`: `id_linha` do título (apenas em rateios)
- `nivel`: 0 para título, 1+ para rateios
- Campos comuns + para rateio: `codigo_centro_custo`, `descricao_centro_custo`,
  `numero_projeto`, `codigo_fase_projeto`, `percentual_rateio`, `valor_rateado`,
  `origem_rateio`.

### Problema 1 — Erro SQL (`numero_nf` / `serie_nf` inválidos)

```
[42S22] Nome de coluna 'numero_nf' inválido.
[42S22] Nome de coluna 'serie_nf' inválido.
```

Causa: o SELECT/WHERE da query árvore referencia `numero_nf` e `serie_nf` na
tabela base (provavelmente `E550MOV`/título financeiro), que não possui esses
campos. Eles existem em `E140NFV` (saída) / `E440NFC` (entrada).

Correção esperada: **remover** essas colunas do SELECT/WHERE da query árvore,
**ou** fazer JOIN com a tabela de NF correspondente usando a chave de
movimento (`cod_emp`, `cod_fil`, `tip_tit`, `num_tit`).

### Problema 2 — Centro de custo incorreto nos rateios

Sintoma: linhas filhas (`tipo_linha = 'RATEIO'`) retornam
`codigo_centro_custo` / `descricao_centro_custo` divergentes do ERP.

Causa provável:
1. JOIN com `E550CCU` sem filtro composto por empresa (`cod_emp`).
2. Leitura do `cod_ccu` do **cabeçalho do título** em vez do `cod_ccu` da
   **própria linha de rateio**.

Correção esperada: ler `cod_ccu` da tabela de rateio (`E075RAT.cod_ccu` para
pagar, `E550RAT.cod_ccu` para receber) e fazer JOIN composto:

```sql
-- Contas a Pagar (rateios)
SELECT  rat.num_tit,
        rat.cod_ccu,
        ccu.nom_ccu  AS descricao_centro_custo,
        rat.per_rat  AS percentual_rateio,
        rat.val_rat  AS valor_rateado,
        rat.cod_prj  AS numero_projeto
FROM    e075rat rat
LEFT JOIN e550ccu ccu
       ON ccu.cod_emp = rat.cod_emp
      AND ccu.cod_ccu = rat.cod_ccu
WHERE   rat.cod_emp = :cod_emp
  AND   rat.tip_tit = :tip_tit
  AND   rat.num_tit = :num_tit;

-- Contas a Receber (rateios) — análogo, usando E550RAT
```

### Validação após o ajuste

1. Chamar `/api/contas-pagar-arvore` sem filtro de NF — não deve mais retornar
   erro 207 do SQL Server.
2. Para um título conhecido com 2+ rateios, conferir que cada linha filha
   exibe o `codigo_centro_custo` correto conforme o cadastro do ERP.
3. Soma de `percentual_rateio` por título = 100%.

### Problema 3 — Rateios ausentes na resposta árvore

Sintoma observado em `/api/contas-pagar-arvore?numero_titulo=975462S-1`:

```json
{
  "total_registros": 1,
  "modo_exibicao": "ARVORE",
  "dados": [
    {
      "tipo_linha": "TITULO",
      "id_linha": "1-1-01-975462S-1",
      "numero_titulo": "975462S-1",
      "codigo_centro_custo": "",
      "descricao_centro_custo": "",
      "numero_projeto": 0,
      "possui_filhos": false,
      "nivel": 0
    }
  ]
}
```

O título existe e tem rateio cadastrado em `E075RAT` no ERP Senior, mas o
backend devolve `possui_filhos = false` e nenhuma linha `tipo_linha = "RATEIO"`.
Resultado: o frontend (modo árvore) não tem o que expandir — comportamento
correto da UI dado o payload recebido.

#### Correção esperada

Para cada título retornado, o backend deve consultar `E075RAT` filtrando pela
chave composta do título e anexar uma linha por rateio à resposta:

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

Cada linha de rateio na resposta JSON deve seguir o contrato:

```json
{
  "tipo_linha": "RATEIO",
  "id_linha": "1-1-01-975462S-1-RAT-1",
  "codigo_pai": "1-1-01-975462S-1",
  "nivel": 1,
  "codigo_centro_custo": "663",
  "descricao_centro_custo": "PRODUÇÃO",
  "numero_projeto": "P-2024-014",
  "percentual_rateio": 100.0,
  "valor_rateado": 118078.49,
  "origem_rateio": "E075RAT"
}
```

Quando houver pelo menos uma linha de rateio, o título-pai deve vir com
`possui_filhos = true`.

#### Validação

1. `GET /api/contas-pagar-arvore?numero_titulo=975462S-1` deve retornar
   `total_registros >= 2` (1 título + N rateios).
2. Soma de `percentual_rateio` por título = 100%.
3. Frontend passa a renderizar o nó-pai com chevron expansível e exibe os
   centros de custo / projetos no nível 1.

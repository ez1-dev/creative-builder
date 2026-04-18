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

# Painel de Compras — filtro `coddep` (Depósito)

## Contexto

O painel `/api/painel-compras` ganhou um campo de filtro **Depósito** no
frontend, alinhado com `EstoquePage` e `EstoqueMinMaxPage` (ambos já usam
o parâmetro `coddep`).

## Contrato proposto

`GET /api/painel-compras` — novo parâmetro **`coddep`** (string, opcional).

| Valor recebido | Comportamento                                          |
|----------------|---------------------------------------------------------|
| ausente / vazio| Não filtra                                              |
| `001`          | Filtra OCs cujo depósito (na tabela de itens da OC) seja `001` |

A coluna no Senior costuma ser `E300OCP.CODDEP` (depósito por item da OC) ou
o campo equivalente que sua query já está usando para
`numero_oc`/`codigo_item`. Aplicar `UPPER(TRIM(...))` para normalização.

Mesma regra deve valer no endpoint de exportação `/api/export/painel-compras`.

### Pseudocódigo (FastAPI)

```python
if coddep:
    where.append("UPPER(TRIM(E300OCP.CODDEP)) = UPPER(TRIM(?))")
    params.append(coddep)
```

## Comportamento atual do frontend

Hoje o frontend já envia `coddep` quando preenchido. Se o backend ainda
não conhece o parâmetro, ele apenas o ignora — sem regressão. Quando o
backend implementar, o filtro passa a ter efeito real sem nenhuma mudança
adicional na UI.

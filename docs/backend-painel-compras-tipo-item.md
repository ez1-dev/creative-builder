# Backend patch — Painel de Compras: filtro `tipo_item` ignorado

> **Status: RESOLVIDO.** O backend agora distingue corretamente `PRODUTO`/`SERVICO` (com e sem cedilha) e devolve `dados`, `totais` e `graficos` filtrados. A mitigação client-side em `PainelComprasPage.tsx` foi **removida**.


## Resumo do bug

O endpoint `GET /api/painel-compras` está **ignorando** o parâmetro `tipo_item` quando o valor enviado é `SERVICO` (sem cedilha). O frontend passa a usar a forma sem acento (consistente com nomes de variáveis e URL), mas a comparação no backend é feita contra a string `"SERVIÇO"` (com cedilha), então a condição falha e o `WHERE` não é aplicado — o backend devolve **todos** os registros como se nenhum filtro tivesse sido informado.

### Evidência (capturada do preview)

Request:

```
GET /api/painel-compras?tipo_item=SERVICO&somente_pendentes=true&agrupar_por_fornecedor=false&mostrar_valor_total_oc=false&pagina=1&tamanho_pagina=100
```

Response (status 200):

```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 2278,
  "total_paginas": 23,
  "dados": [
    { "numero_oc": 40734, "tipo_item": "PRODUTO", ... },
    { "numero_oc": 40734, "tipo_item": "PRODUTO", ... },
    ...
  ]
}
```

Comparando com a chamada sem filtro:

```
GET /api/painel-compras?somente_pendentes=true&agrupar_por_fornecedor=false&mostrar_valor_total_oc=false&pagina=1&tamanho_pagina=100
-> total_registros: 2278  (idêntico)
```

Mesmo `total_registros`, mesmas linhas, todas com `tipo_item = "PRODUTO"`. Conclusão: o filtro foi silenciosamente descartado.

## Endpoints afetados

- `GET /api/painel-compras`
- `GET /api/export/painel-compras` (reusa `consultar_painel_compras` e repassa `tipo_item`)

## Correção esperada

### 1. Função utilitária de normalização

Criar (ou reusar, se já houver módulo de utils) uma função que aceite todas as variações comuns recebidas do frontend ou do Assistente de IA:

```python
def normalizar_tipo_item(valor: str | None) -> str:
    """
    Normaliza o filtro de tipo de item.
    Retorna sempre 'PRODUTO', 'SERVICO' ou 'TODOS'.
    """
    if not valor:
        return "TODOS"
    v = valor.strip().upper().replace("Ç", "C")
    if v in {"SERVICO", "SERVICOS", "S"}:
        return "SERVICO"
    if v in {"PRODUTO", "PRODUTOS", "P"}:
        return "PRODUTO"
    return "TODOS"


def normalizar_tipo_oc(valor: str | None) -> str:
    """
    Normaliza o filtro de tipo de OC (cabeçalho).
    Retorna 'PRODUTO', 'SERVICO', 'MISTA', 'NORMAL' ou 'TODOS'.
    """
    if not valor:
        return "TODOS"
    v = valor.strip().upper().replace("Ç", "C")
    if v in {"SERVICO", "SERVICOS", "S"}:
        return "SERVICO"
    if v == "PRODUTO":
        return "PRODUTO"
    if v == "MISTA":
        return "MISTA"
    if v == "NORMAL":
        return "NORMAL"
    return "TODOS"
```

### 2. Aplicação no `consultar_painel_compras`

Substituir a comparação atual (que provavelmente usa algo como `if tipo_item in ("PRODUTO", "SERVIÇO")`) por:

```python
tipo = normalizar_tipo_item(params.tipo_item)
if tipo == "PRODUTO":
    query = query.where(Q.tipo_item == "PRODUTO")
elif tipo == "SERVICO":
    # aceita ambas as grafias eventualmente presentes na base
    query = query.where(Q.tipo_item.in_(["SERVICO", "SERVIÇO"]))
# tipo == "TODOS" => não aplica filtro

tipo_oc = normalizar_tipo_oc(params.tipo_oc)
if tipo_oc == "PRODUTO":
    query = query.where(Q.tipo_oc == "PRODUTO")
elif tipo_oc == "SERVICO":
    query = query.where(Q.tipo_oc.in_(["SERVICO", "SERVIÇO"]))
elif tipo_oc == "MISTA":
    query = query.where(Q.tipo_oc == "MISTA")
elif tipo_oc == "NORMAL":
    query = query.where(Q.tipo_oc == "NORMAL")
```

### 3. Padronização do retorno

Para evitar que o frontend tenha de tratar variações, o `SELECT` deve retornar `tipo_item` e `tipo_oc` **sempre sem acento** (`'PRODUTO'` ou `'SERVICO'`). Sugestão (Postgres / Oracle):

```sql
REPLACE(UPPER(TRIM(tipo_item)), 'Ç', 'C') AS tipo_item
REPLACE(UPPER(TRIM(tipo_oc)),   'Ç', 'C') AS tipo_oc
```

(em SQLAlchemy: `func.replace(func.upper(func.trim(Q.tipo_item)), 'Ç', 'C').label('tipo_item')`)

### 4. Export

Como `/api/export/painel-compras` já chama `consultar_painel_compras` e repassa `tipo_item`/`tipo_oc`, basta garantir que ele use a mesma função `consultar_painel_compras` corrigida — nenhuma duplicação de lógica.

## Checklist de validação

Após aplicar o patch, executar:

```
# 1) Filtro principal sem acento (caso reportado)
GET /api/painel-compras?tipo_item=SERVICO&somente_pendentes=false
   -> dados[*].tipo_item == 'SERVICO'   (todos)
   -> total_registros < total sem filtro
   -> total_registros != total com tipo_item=PRODUTO

# 2) Variações aceitas
GET /api/painel-compras?tipo_item=SERVIÇO   -> mesmo resultado de SERVICO
GET /api/painel-compras?tipo_item=S         -> mesmo resultado de SERVICO
GET /api/painel-compras?tipo_item=servico   -> mesmo resultado (case-insensitive)

# 3) Produto e geral
GET /api/painel-compras?tipo_item=PRODUTO   -> só PRODUTO
GET /api/painel-compras?tipo_item=TODOS     -> ambos
GET /api/painel-compras                     -> ambos (sem filtro)

# 4) tipo_oc
GET /api/painel-compras?tipo_oc=SERVICO     -> dados[*].tipo_oc IN ('SERVICO','SERVIÇO')
GET /api/painel-compras?tipo_oc=MISTA       -> só MISTA
GET /api/painel-compras?tipo_oc=NORMAL      -> só NORMAL

# 5) Export
GET /api/export/painel-compras?tipo_item=SERVICO -> XLSX só com serviços
GET /api/export/painel-compras?tipo_item=PRODUTO -> XLSX só com produtos
```

## Notas

- O frontend (`src/pages/PainelComprasPage.tsx`) já envia exclusivamente `PRODUTO`, `SERVICO` ou `TODOS` (sem acento). Não há plano de mudar isso — o backend é quem deve aceitar ambas as grafias.
- Enquanto este patch não é aplicado, o frontend está fazendo uma **mitigação client-side**: filtra `data.dados` localmente quando `tipo_item ≠ TODOS` e mostra um aviso `"Filtro aplicado localmente — backend ainda não distingue SERVICO sem acento."`. Essa mitigação afeta só a página corrente (paginação continua vindo do backend com totais incorretos), por isso a correção no backend é necessária para resolver de verdade.
- Após o patch, remover a mitigação no front (busca por comentário `// MITIGACAO_TIPO_ITEM` em `PainelComprasPage.tsx`).

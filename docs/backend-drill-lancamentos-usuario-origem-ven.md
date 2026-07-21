# Backend — Corrigir `usuario_origem` no drill do Razão (origem VEN)

Endpoint: `GET /api/contabil/drill-lancamentos`

Escopo desta demanda: **apenas `origem_codigo = VEN`**. REC / EST / MAN / PAT serão tratadas em specs separadas.

> Não alterar autenticação, CORS, formato geral do endpoint, cálculo contábil, paginação, filtros nem componentes visuais do drill. O frontend (`src/components/dre-studio/DrillDrawer.tsx` + `src/lib/contabil/drillLancamentosApi.ts`) já consome `usuario_origem`, `usuario_lancamento`, `usuario_origem_codigo` e `usuario_origem_difere` em campos separados — não precisa de mudança.

---

## Problema confirmado

Hoje, para lançamentos com `origem_codigo = VEN`, o backend devolve como `usuario_origem` (ou apenas `usuario`) o valor de `E640LCT.CODUSU`, que é o usuário que **efetivou o lançamento contábil** (frequentemente `agendador`, integração noturna, etc.).

O usuário operacional correto para origem VEN é quem **gerou a nota fiscal de saída**, disponível em:

```
E140NFV.USUGER
```

relacionado ao cadastro de usuários `R999USU`.

Como consequência, `usuario_origem_difere` fica sempre `false` (ou `null`) para VEN e o realce âmbar no drill nunca dispara em produção.

---

## Exemplo real validado

```
Empresa: 1
Filial:  1
Lote:    12932
Lançamento: 1301707160
Origem:  VEN
CPLLCT:  "20567","Bunge (S. Francisco)"
NF extraída (NUMNFV): 20567

Usuário do lançamento (E640LCT.CODUSU):
  código 84   →  agendador

Usuário que gerou a NF (E140NFV.USUGER):
  código 302  →  yasmin.rodrigues
```

Retorno esperado do item no `itens[]`:

```json
{
  "origem_codigo": "VEN",
  "documento_origem": 20567,
  "usuario": "agendador",
  "usuario_lancamento_codigo": 84,
  "usuario_lancamento": "agendador",
  "usuario_origem_codigo": 302,
  "usuario_origem": "yasmin.rodrigues",
  "usuario_origem_fonte": "E140NFV.USUGER",
  "usuario_origem_difere": true
}
```

---

## Implementação necessária

### 1. Extrair a NF de `E640LCT.CPLLCT`

`CPLLCT` chega no formato:

```
"20567","Bunge (S. Francisco)"
```

Extração segura no SQL (alias `L` = `E640LCT`):

```sql
OUTER APPLY (
    SELECT TRY_CONVERT(
        INT,
        NULLIF(
            REPLACE(
                LTRIM(RTRIM(
                    LEFT(
                        L.CPLLCT,
                        CHARINDEX(',', L.CPLLCT + ',') - 1
                    )
                )),
                '"',
                ''
            ),
            ''
        )
    ) AS NUMNFV_EXTRAIDA
) DOC
```

### 2. Relacionar com a NF de saída (`E140NFV`)

**Nunca** relacionar somente por `NUMLOT` — o mesmo lote pode conter várias notas com usuários diferentes.

```sql
LEFT JOIN E140NFV NFVEN
       ON LTRIM(RTRIM(L.ORILCT)) = 'VEN'
      AND NFVEN.CODEMP = L.CODEMP
      AND NFVEN.CODFIL = L.CODFIL
      AND NFVEN.NUMLOT = L.NUMLOT
      AND NFVEN.NUMNFV = DOC.NUMNFV_EXTRAIDA
```

### 3. Resolver separadamente os dois usuários em `R999USU`

```sql
LEFT JOIN R999USU ULANC
       ON ULANC.CODUSU = L.CODUSU

LEFT JOIN R999USU UORIGEM
       ON UORIGEM.CODUSU = NFVEN.USUGER
```

E acrescentar ao `SELECT`:

```sql
L.CODUSU                                   AS usuario_lancamento_codigo,
LTRIM(RTRIM(ULANC.NOMUSU))                 AS usuario_lancamento,

NFVEN.USUGER                               AS usuario_origem_codigo,
LTRIM(RTRIM(UORIGEM.NOMUSU))               AS usuario_origem,

DOC.NUMNFV_EXTRAIDA                        AS documento_origem,

CASE
    WHEN NFVEN.USUGER IS NOT NULL
        THEN 'E140NFV.USUGER'
    ELSE NULL
END                                        AS usuario_origem_fonte,

CASE
    WHEN NFVEN.USUGER IS NULL OR L.CODUSU IS NULL
        THEN NULL
    WHEN NFVEN.USUGER <> L.CODUSU
        THEN CAST(1 AS BIT)
    ELSE CAST(0 AS BIT)
END                                        AS usuario_origem_difere
```

### 4. Pós-processamento Python

Comparar sempre **códigos**, nunca nomes. E manter compatibilidade com consumidores antigos preenchendo `item["usuario"]` a partir de `usuario_lancamento`:

```python
cod_lancamento = item.get("usuario_lancamento_codigo")
cod_origem     = item.get("usuario_origem_codigo")

if cod_lancamento is None or cod_origem is None:
    item["usuario_origem_difere"] = None
else:
    item["usuario_origem_difere"] = (
        int(cod_lancamento) != int(cod_origem)
    )

# Compat: consumidores antigos ainda leem `usuario`
item["usuario"] = item.get("usuario_lancamento")
```

### 5. Regras proibidas

Nada disso pode existir no código:

```python
usuario_origem = usuario_origem or usuario_lancamento   # ❌
usuario_origem = usuario_lote                           # ❌
usuario_origem = usuario_log                            # ❌
```

- **Não** esconder `usuario_origem` quando for igual a `usuario_lancamento` — mostrar os dois iguais é informação válida.
- `E640LOT.USULOT` (ou qualquer usuário do lote contábil) **não** pode substituir `E140NFV.USUGER` para origem VEN.

### 6. Ambiguidade (múltiplas NFs para a mesma chave)

Se o `JOIN` em `E140NFV` retornar mais de uma linha para a mesma combinação (`CODEMP+CODFIL+NUMLOT+NUMNFV`), **não usar `TOP 1` arbitrário**. Devolver:

```json
{
  "usuario_origem": null,
  "usuario_origem_codigo": null,
  "usuario_origem_difere": null,
  "usuario_origem_status": "AMBIGUO"
}
```

E registrar em log as chaves do lançamento (`codemp`, `codfil`, `numlot`, `lancamento`, `numnfv_extraida`) para diagnóstico.

---

## Escopo e não-objetivos

Aplicar **agora somente** para `origem_codigo = VEN`.

Não inventar tabelas para REC / EST / MAN / PAT — serão validadas separadamente com o mapa correto de cada subsistema.

Não alterar:

- autenticação das rotas `/api/contabil`;
- CORS;
- formato geral do endpoint (mesmo shape de `itens[]`, `truncado`, `qtd_total`, `total_valor`);
- cálculo contábil / saldos;
- paginação;
- filtros;
- componentes visuais do drill (frontend já pronto).

---

## Critérios de aceite

Validar ao menos os dois casos abaixo, ambos no mesmo lote (prova de que resolver por lote é insuficiente):

**Caso 1**

```
Lote 12932  ·  Lançamento 1301707160  ·  NF 20567
usuario_lancamento     = agendador
usuario_origem         = yasmin.rodrigues
usuario_origem_difere  = true
```

**Caso 2**

```
Lote 12932  ·  Lançamento 1301707161  ·  NF 20568
usuario_lancamento     = agendador
usuario_origem         = joao.santos
usuario_origem_difere  = true
```

---

## Retorno esperado após a alteração

Reportar de volta:

1. Arquivo e função alterados no FastAPI.
2. SQL final utilizado (query completa).
3. Trecho do pós-processamento Python.
4. Resposta JSON dos dois casos de teste (itens 1 e 2).
5. Confirmação explícita de que **nenhuma outra origem** (`REC`, `EST`, `MAN`, `PAT`, …) e **nenhuma outra rota** foi modificada.

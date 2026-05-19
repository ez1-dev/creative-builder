# Backend — Demonstrativo de Compras e Recebimentos: erro 22007

## Sintoma

```
('22007', '[22007] [Microsoft][ODBC Driver 17 for SQL Server][SQL Server]
A conversão de um tipo de dados nvarchar em um tipo de dados datetime
resultou em um valor fora do intervalo. (242) (SQLExecDirectW)')
```

O erro vem do SQL Server na execução da query do endpoint
`GET /api/demonstrativo-compras-recebimentos`. O driver ODBC recebeu uma
string que não conseguiu converter para `datetime`.

## Causas mais comuns

1. `data_ini` / `data_fim` chegando como string vazia e o SQL fazendo
   `CONVERT(datetime, '')` ou `CAST('' AS datetime)`.
2. `mes_competencia` recebido como `YYYY-MM` e passado direto para `CONVERT`
   (esperando `YYYY-MM-DD`).
3. Defaults tipo `'0001-01-01'` / `'9999-12-31'` fora do range aceito pelo
   `datetime` (1753-01-01 a 9999-12-31; o range real útil começa em 1900).
4. Filtros opcionais novos (`numero_oc`, `numero_nf`, `documento`,
   `tipo_item`, `deposito`, `familia`, `origem_material`, `transacao`)
   sendo concatenados em alguma cláusula que aplica `CONVERT(datetime, ...)`
   no campo errado.

## Mitigação já aplicada no frontend

`src/pages/DemonstrativoComprasRecebimentosPage.tsx` agora sanitiza antes
de enviar:

- `data_ini` / `data_fim`: só passa quando casar com `/^\d{4}-\d{2}-\d{2}$/`
  e `Date.parse` for válido.
- `mes_competencia`: só passa quando casar com `/^\d{4}-(0[1-9]|1[0-2])$/`.
- `tipo_item`: aceita apenas `PRODUTO` ou `SERVICO`.

Isso elimina o caminho mais comum (string vazia ou mal formada). Se o erro
persistir, o problema está exclusivamente no backend.

## Correção definitiva no FastAPI

### 1. Tipagem forte nos query params

```python
from datetime import date
from typing import Optional, Literal
from fastapi import Query
from pydantic import BaseModel, field_validator
import re

class DemonstrativoFilters(BaseModel):
    data_ini: Optional[date] = None
    data_fim: Optional[date] = None
    origem: Literal["TODOS", "COMPRAS", "RECEBIMENTOS"] = "TODOS"
    nivel: Literal[
        "projeto_macro","numero_projeto","centro_custo","tipo_despesa",
        "mes_competencia","fornecedor","documento","item","transacao","deposito",
    ] = "projeto_macro"
    mes_competencia: Optional[str] = None
    tipo_item: Optional[Literal["PRODUTO", "SERVICO"]] = None
    # demais filtros: Optional[str]

    @field_validator("mes_competencia")
    @classmethod
    def _mes(cls, v):
        if v in (None, ""):
            return None
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", v):
            raise ValueError("mes_competencia deve estar no formato YYYY-MM")
        return v
```

Com `Optional[date]` o FastAPI devolve `422` para qualquer string mal
formada antes mesmo de tocar no banco.

### 2. WHERE parametrizado (pyodbc)

Nunca concatene datas na string SQL. Use `?` e passe o `date` como parâmetro
— o driver faz a conversão correta para `datetime`:

```python
where = ["1=1"]
params: list = []

if f.data_ini:
    where.append("data_emissao >= ?")
    params.append(f.data_ini)
if f.data_fim:
    where.append("data_emissao <= ?")
    params.append(f.data_fim)

if f.mes_competencia:
    ano, mes = map(int, f.mes_competencia.split("-"))
    ini = date(ano, mes, 1)
    fim = date(ano + (mes == 12), (mes % 12) + 1, 1)  # primeiro dia do mês seguinte
    where.append("mes_competencia >= ? AND mes_competencia < ?")
    params.extend([ini, fim])

sql = f"SELECT ... FROM ... WHERE {' AND '.join(where)}"
cursor.execute(sql, params)
```

### 3. Filtros opcionais como `nvarchar`

Confirme que `numero_oc`, `numero_nf`, `documento`, `tipo_item`, `deposito`,
`familia`, `origem_material`, `transacao`, `fornecedor`, `centro_custo`,
`projeto_macro`, `numero_projeto`, `condicao_pagamento`, `descricao_item`
são aplicados como string:

```python
if f.numero_oc:
    where.append("CAST(numero_oc AS NVARCHAR(40)) = ?")
    params.append(str(f.numero_oc))
```

Nunca aplique `CONVERT(datetime, numero_oc)` ou similares.

### 4. Defaults seguros

Se o código de fallback de algum filtro usa `'0001-01-01'` ou `'9999-12-31'`,
troque por `None` (e omita do WHERE) ou por limites dentro do range
`datetime` (`1900-01-01` / `9999-12-31`). Para campos com horário em SQL
Server moderno, prefira `datetime2`.

### 5. Como reproduzir

Rode o request mínimo que reproduz o erro hoje:

```
GET /api/demonstrativo-compras-recebimentos
    ?origem=TODOS
    &nivel=projeto_macro
```

(sem `data_ini`/`data_fim`). Se ainda quebrar, o problema é um default
inválido no próprio backend. Ative o log do `cursor` para imprimir o SQL
final e os parâmetros enviados — quase sempre revela o `CONVERT` ofensor.

## Checklist final

- [ ] Pydantic recebe `data_ini`/`data_fim` como `Optional[date]`.
- [ ] `mes_competencia` validado por regex `YYYY-MM`.
- [ ] WHERE 100% parametrizado (`?` no pyodbc) — sem `CONVERT` em strings
      vindas do usuário.
- [ ] Nenhum default `'0001-01-01'` / `'9999-12-31'` no código.
- [ ] Filtros não-data aplicados sempre como `nvarchar`.
- [ ] Reproduzido o request mínimo (`origem=TODOS&nivel=projeto_macro`) com
      sucesso.

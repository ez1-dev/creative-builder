

## Backend ainda exige numorp/codori — correção fora do Lovable

### Diagnóstico
O erro `numorp: Field required; codori: Field required` é resposta **422 do FastAPI**, não erro do frontend. Significa que o backend ainda declara esses dois parâmetros como obrigatórios na rota `/api/apontamentos-producao`.

O frontend deste projeto já está 100% correto:
- `buildAuditoriaListParams` omite `numorp`/`codori` quando vazios (testado em `AuditoriaApontamentoGeniusPage.contract.test.tsx`).
- `api.get` não inclui chaves `undefined` na URL (testado em `api.test.ts` e `AuditoriaApontamentoGeniusPage.search.test.tsx`).
- UI sem asterisco, sem bloqueio de submit, sem guard no export.

**Não há nada para corrigir no Lovable.** A correção é no seu repositório FastAPI (fora deste projeto).

### O que você precisa fazer no backend FastAPI

Em **ambas** as rotas (`/api/apontamentos-producao` e `/api/export/apontamentos-producao`), trocar a assinatura para:

```python
from typing import Optional

@app.get('/api/apontamentos-producao')
def consultar_apontamentos_producao(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    numorp: Optional[int] = None,      # <-- era obrigatório, agora opcional
    codori: Optional[int] = None,      # <-- era obrigatório, agora opcional
    codpro: Optional[str] = None,
    operador: Optional[str] = None,
    status_op: Optional[str] = None,
    somente_discrepancia: int = 0,
    somente_acima_8h: int = 0,
    pagina: int = 1,
    tamanho_pagina: int = 100,
    usuario=Depends(validar_token),
):
    where_parts = []
    params_where = []

    if data_ini:
        where_parts.append("BASE.data_movimento >= ?")
        params_where.append(data_ini)
    if data_fim:
        where_parts.append("BASE.data_movimento <= ?")
        params_where.append(data_fim)
    if numorp is not None:                        # <-- só filtra se veio
        where_parts.append("BASE.numero_op = ?")
        params_where.append(numorp)
    if codori is not None:                        # <-- só filtra se veio
        where_parts.append("BASE.origem = ?")
        params_where.append(codori)
    if codpro:
        where_parts.append("BASE.codigo_produto LIKE ?")
        params_where.append(f"%{codpro}%")
    if operador:
        where_parts.append("BASE.nome_operador LIKE ?")
        params_where.append(f"%{operador}%")
    if status_op and status_op != 'TODOS':
        where_parts.append("BASE.status_movimento = ?")
        params_where.append(status_op)
    # ... resto da lógica
```

Repetir o mesmo padrão em `/api/export/apontamentos-producao`.

**Pontos críticos:**
1. `Optional[int] = None` — sem `= None` o FastAPI continua exigindo.
2. Usar `if numorp is not None` no SQL (não `if numorp`, porque `0` seria falso).
3. Reiniciar o serviço FastAPI depois do deploy.

### Como confirmar que funcionou
Após subir o backend:
1. Abrir `/auditoria-apontamento-genius`, deixar OP e Origem vazios, clicar Pesquisar → request sem `numorp`/`codori` na URL → **200 OK** com todos os apontamentos do período (não mais 422).
2. Preencher só OP `12345` → request com `numorp=12345` → 200 OK filtrado.
3. Exportar com vazios → Excel completo.

### Por que o Lovable não pode resolver isso
- `Field required` é validação **server-side** do Pydantic/FastAPI, gerada antes de o handler rodar.
- Não existe ajuste no frontend (omitir, mandar `null`, mandar string vazia, mandar `0`) que faça o FastAPI aceitar — qualquer coisa diferente de "parâmetro ausente sendo opcional na assinatura" volta 422.
- Lovable só edita o código deste projeto (React/TypeScript). O FastAPI vive no seu servidor/repo separado.

### Se quer evitar o 422 visível na tela enquanto o backend não muda
Posso adicionar tratamento extra no frontend para detectar especificamente esse 422 e exibir uma mensagem amigável tipo "Backend ainda não suporta busca sem OP/Origem — preencha ambos para consultar". Mas isso é paliativo, não corrige o problema. Se quiser esse paliativo, peça explicitamente.


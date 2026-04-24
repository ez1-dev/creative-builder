

## Ajuste — não vou aplicar este patch como está

O patch que você colou **não bate com o código deste projeto**. Antes de qualquer coisa, alinhamento:

### Por que o patch não se aplica
1. **Não existe `Texto colado.txt`** no repositório. A tela é React/TypeScript em `src/pages/AuditoriaApontamentoGeniusPage.tsx`.
2. **Não existe `montarQueryStringApontGenius`** nem `document.getElementById(...)`. O frontend usa React + `useState` + `ApiClient.get()`, não DOM puro.
3. **Backend FastAPI está fora do Lovable.** Eu só edito o frontend deste projeto. As mudanças em `/api/apontamentos-producao` (assinatura Python, SQL, etc.) você precisa aplicar no seu repositório do FastAPI manualmente.
4. **Nomes dos params do contrato atual** neste frontend são `numorp` e `codori` (inteiros), não `numero_op`/`origem` (string). O backend novo descrito no patch volta para `numero_op`/`origem` como string opcional — é uma mudança de contrato que precisa ser feita nos dois lados, em ordem.

### O que de fato falta para o cenário funcionar
O **frontend já está pronto** desde o último deploy: OP e Origem são opcionais, o builder omite quando vazios, sem bloqueio de UI, sem asterisco. O que falta é o **backend** aceitar a ausência desses campos.

Você tem duas opções de contrato. Escolha uma e ajuste o backend de acordo. Eu sincronizo o frontend depois.

---

### Opção 1 — Manter contrato atual (`numorp`/`codori` como inteiros opcionais) ✅ recomendado
**Backend (você faz no FastAPI):**
```python
@app.get('/api/apontamentos-producao')
def consultar_apontamentos_producao(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    numorp: Optional[int] = None,
    codori: Optional[int] = None,
    codpro: Optional[str] = None,
    operador: Optional[str] = None,
    status_op: Optional[str] = None,
    somente_discrepancia: int = 0,
    somente_acima_8h: int = 0,
    pagina: int = 1,
    tamanho_pagina: int = 100,
    usuario=Depends(validar_token),
):
    ...
    if numorp is not None:
        where_parts.append("BASE.numero_op = ?")
        params_where.append(numorp)
    if codori is not None:
        where_parts.append("BASE.origem = ?")
        params_where.append(codori)
```
Mesma coisa em `/api/export/apontamentos-producao`.

**Frontend:** zero mudança. Já está correto.

---

### Opção 2 — Adotar o contrato do patch (`numero_op`/`origem` como string opcional)
Aí o backend fica como você descreveu (com `numero_op`, `origem`, `codigo_produto`, `status_op`, sem `somente_*`).

**Frontend (eu aplico):**
- Renomear no builder: `numorp → numero_op` (string), `codori → origem` (string), `codpro → codigo_produto`.
- Remover `somente_discrepancia` e `somente_acima_8h` da UI e dos params.
- Remover `toIntOrUndef` desses dois (passam a ser string).
- Atualizar testes (`AuditoriaApontamentoGeniusPage.contract.test.tsx` e `ExportButton.test.tsx`) para os nomes novos.
- Remover do `resumo` os campos relacionados a `acima_8h`/`discrepancia` se o backend deixar de retornar.

⚠️ Isso quebra: filtro de "discrepância" e "apontamento > 8h" que hoje existem na tela. Eles seriam removidos da UI também. Confirma se é isso mesmo.

---

### Decisão necessária
Responda só com **"Opção 1"** ou **"Opção 2"**:
- **Opção 1** → você ajusta o backend e nada muda no frontend. Mais rápido, preserva os filtros de discrepância/8h.
- **Opção 2** → eu refatoro o frontend (nomes novos + remover filtros de discrepância/8h) e você reescreve a rota no FastAPI conforme o patch.

Sem a sua escolha eu não mexo, porque qualquer das duas direções é destrutiva para a outra.


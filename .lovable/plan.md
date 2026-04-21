
## Não posso implementar — backend FastAPI está fora deste projeto

O projeto Lovable atual é **somente o frontend React + Supabase Edge Functions**. O backend FastAPI do ERP (que serve `https://flakily-wanning-faye.ngrok-free.dev/api/...`) roda em outro repositório/servidor ao qual eu não tenho acesso de leitura nem de escrita.

Não consigo:
- Ler os arquivos atuais do FastAPI (rotas existentes, `validar_token`, `get_connection`, padrão do `/api/estoque`).
- Criar/editar arquivos `.py` no backend.
- Fazer deploy da nova rota.

O que posso entregar **dentro deste projeto** para você levar pronto ao backend:

### Entregável: `docs/backend-rota-movimentacao.md`

Arquivo único com a implementação completa em Python/FastAPI, copy-paste, seguindo o padrão descrito por você (`Depends(validar_token)`, `get_connection()`, paginação `pagina`/`tamanho_pagina`/`total_registros`/`total_paginas`/`dados`).

Conteúdo:

1. **Router completo** (`routers/estoque_movimentacao.py`) com:
   - Assinatura `@router.get("/movimentacao")` + `Depends(validar_token)`.
   - Query params: `codpro, despro, codfam, codori, codder, coddep, data_ini, data_fim, pagina=1, tamanho_pagina=100`.
   - `cursor = get_connection().cursor()` no padrão do projeto.
   - Bloco `try/finally` fechando cursor/conexão.

2. **SQL T-SQL** (SQL Server / Senior) usando:
   - `E210MVP` como base (campos prováveis: `CODEMP, CODFIL, CODPRO, CODDER, CODDEP, DATMOV, TIPMOV, CODTRA, QTDMOV, NUMDOC`).
   - `LEFT JOIN E210EST` agregado por `(CODEMP, CODPRO, CODDER, CODDEP)` para `saldo_atual`.
   - `LEFT JOIN E075PRO` para `DESPRO, CODFAM, CODORI, UNIMED`.
   - Filtros opcionais com `(:param IS NULL OR campo = :param)` e `LIKE` para `codpro/despro`.
   - Paginação `OFFSET/FETCH NEXT` + `COUNT(*) OVER()` para `total_registros`.
   - Comentário de fallback se algum nome de campo divergir (ex.: `DATEMI` vs `DATMOV`, `QTD` vs `QTDMOV`) — instruções para ajustar mantendo a estrutura.

3. **Pydantic models** (`MovimentacaoItem`, `PaginatedMovimentacao`) com os mesmos campos consumidos pelo frontend (`src/pages/SugestaoMinMaxPage.tsx`): `codemp, codpro, codder, coddep, data_movimento, tipo_movimento, transacao, deposito, quantidade, documento, fornecedor, origem, saldo_atual, despro, codfam, codori, unimed`.

4. **Registro no `main.py`**: linha `app.include_router(estoque_movimentacao.router, prefix="/api/estoque", tags=["estoque"])`.

5. **Teste curl** pronto:
   ```bash
   curl -H "Authorization: Bearer $JWT" \
     "$ERP/api/estoque/movimentacao?data_ini=2025-01-01&data_fim=2025-04-21&pagina=1&tamanho_pagina=100"
   ```

6. **Checklist de validação** para o backend confirmar antes de subir (filtros, paginação, contagem total, campos retornados).

### O que muda no frontend deste projeto

**Nada.** A tela `/sugestao-min-max` já consome exatamente esse contrato — assim que o backend publicar a rota, o banner amarelo "Backend pendente" some sozinho na primeira resposta 200 e o fluxo Consultar → Gerar → Sugerir com IA → Salvar passa a operar com dados reais.

### Caminho alternativo (se preferir)

Se você quiser que eu implemente diretamente no FastAPI, preciso de uma das duas:
- **Acesso ao repositório do backend** (ex.: subir os arquivos `.py` atuais como referência neste projeto, em `docs/backend-referencia/`, para eu replicar exatamente o padrão de `validar_token`, `get_connection` e a rota `/api/estoque` existente).
- Ou **colar aqui no chat** o conteúdo de: o arquivo da rota `/api/estoque` atual + `validar_token` + `get_connection`. Com isso gero o `routers/estoque_movimentacao.py` 100% aderente ao seu padrão (não genérico).

Confirma se prefere:
- **(1)** Eu gerar agora `docs/backend-rota-movimentacao.md` com a implementação genérica seguindo as convenções FastAPI + Senior ERP descritas; **ou**
- **(2)** Você cola o código da rota `/api/estoque` atual e eu gero a versão exata, idêntica ao padrão do seu projeto.

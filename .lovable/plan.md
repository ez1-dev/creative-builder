
Erro vem do **backend FastAPI** (SQL Server retornando 207 — coluna inválida). O endpoint `/api/contas-pagar-arvore` está enviando `numero_nf` e `serie_nf` no SELECT/WHERE, mas essas colunas não existem na tabela base do SQL Server (provavelmente `E550MOV` que não tem NF, diferente de `E140NFV`/`E440NFC`).

Não posso corrigir SQL do backend (não está neste repo). Mas posso:

1. **Frontend**: parar de enviar `numero_nf` e `serie_nf` para os endpoints árvore (`/api/contas-pagar-arvore` e `/api/contas-receber-arvore`), mantendo o envio normal nas rotas planas. Isso evita o erro mesmo se o backend estiver lendo esses params.
2. **Documentação**: atualizar `docs/backend-contas-centro-custo-projeto.md` adicionando seção sobre os endpoints árvore, listando colunas inválidas (`numero_nf`, `serie_nf`) que precisam ser removidas do SELECT/WHERE no backend, ou substituídas por join com a tabela de NF correspondente.

## Plano

### 1. `src/pages/ContasPagarPage.tsx` e `src/pages/ContasReceberPage.tsx`
No builder de params, quando `modo_arvore` estiver ativo, **remover** `numero_nf` e `serie_nf` antes de chamar a rota árvore. Modos plano e agrupado continuam enviando normalmente.

### 2. `docs/backend-contas-centro-custo-projeto.md`
Adicionar seção **"Endpoints árvore (`/api/contas-pagar-arvore` e `/api/contas-receber-arvore`)"** documentando:
- Erro atual: `numero_nf` e `serie_nf` referenciados no SQL mas não existem na tabela base.
- Correção esperada: remover colunas do SELECT/WHERE ou fazer JOIN com tabela de NF (`E140NFV` para receber, `E440NFC` para pagar) usando chave de movimento.
- Contrato de resposta (linhas pai/filhas com `tipo_linha`, `id_linha`, `codigo_pai`, etc.) já implementado no frontend.

### 3. Sem mudanças em rotas, autenticação, modo plano/agrupado ou exportação.

Resultado: deixa de quebrar a UI quando o usuário não preencher NF; quando o backend ajustar o SQL, o modo árvore voltará a funcionar 100%.

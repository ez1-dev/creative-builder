# Corrigir erro "function gen_salt(unknown) does not exist"

## Causa
A extensão `pgcrypto` está instalada no schema `extensions`, mas a função `create_passagens_share_link` foi criada com `SET search_path = public`, então não encontra `crypt`/`gen_salt`.

## Solução escolhida: hash no cliente (sem depender de pgcrypto)

Como a única utilidade de `pgcrypto` aqui era hashear a senha para o link compartilhado, vou migrar essa lógica para o **frontend** usando a Web Crypto API nativa do browser (SHA-256). Isso elimina a dependência problemática e simplifica o sistema.

### Como vai funcionar

**Ao criar um link com senha:**
1. Frontend gera um `publicToken` aleatório (24 bytes)
2. Frontend calcula `effectiveToken = SHA256(publicToken + "::" + senha)`
3. Salva no banco apenas o `effectiveToken` no campo `token` (a senha nunca é armazenada)
4. Campo `password_hash` recebe apenas a marcação `'protected'` para indicar à UI que o link tem senha
5. Link enviado ao usuário contém **apenas** o `publicToken` + flag `&p=1`

**Ao acessar o link:**
1. Página pública lê o `token` e a flag `p` da URL
2. Se `p=1`: pede a senha ao usuário
3. Frontend recalcula `effectiveToken = SHA256(token + "::" + senha)` e envia ao servidor
4. Servidor apenas verifica se esse `effectiveToken` existe na tabela — sem precisar de `crypt`

### Vantagens
- Elimina o erro do `gen_salt`
- A senha **nunca** trafega para o servidor (apenas o hash já calculado)
- Mais simples: não precisa de funções SQL especiais para hash
- Banco continua sem armazenar a senha em texto puro

### Cuidado importante
Links com senha **não podem ser recuperados depois** (porque o token completo só existe em memória no momento da criação). Se o admin perder o link, precisa revogar e gerar um novo. A UI já vai avisar isso na hora de criar.

## Arquivos alterados

### `src/components/passagens/ShareLinksDialog.tsx`
- Remove a chamada à RPC `create_passagens_share_link`
- Adiciona função `deriveEffectiveToken()` usando `crypto.subtle.digest('SHA-256', ...)`
- Faz INSERT direto na tabela `passagens_aereas_share_links` (admin já tem permissão via RLS)
- Adiciona aviso "copie agora — não poderá ser recuperado depois" para links com senha
- Botão "copiar link" da lista só aparece para links sem senha

### `src/pages/PassagensAereasCompartilhadoPage.tsx`
- Lê parâmetro `p=1` da URL para saber se exige senha (em vez de chamar `get_share_link_meta`)
- Quando exige senha: pede ao usuário, recalcula o `effectiveToken` e chama `get_passagens_via_token` com esse token (sem `_password`)
- A função `get_passagens_via_token` no banco continua igual — só verifica existência do token

## O que **não** muda
- Estrutura da tabela `passagens_aereas_share_links` permanece intacta
- Funções SQL `validate_share_token`, `get_share_link_meta` e `get_passagens_via_token` continuam existindo (não precisam ser tocadas — apenas não vão mais validar senha, pois a senha já está embutida no token efetivo)
- Página administrativa, dashboard, KPIs, gráficos: sem alterações

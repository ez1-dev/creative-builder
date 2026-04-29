## Problema

Ao gerar um link com senha em /passagens-aereas, o backend retorna:
`function gen_salt(unknown) does not exist`

A extensão `pgcrypto` está instalada no schema `extensions` (padrão correto do Lovable Cloud), mas as funções RPC `create_passagens_share_link` e `verify_passagens_share_link` foram criadas com `SET search_path = public`, então não enxergam `gen_salt`/`crypt`.

## Solução

Criar uma migração que recria as duas funções qualificando explicitamente as chamadas como `extensions.gen_salt(...)` e `extensions.crypt(...)`. Isso é mais seguro do que abrir o `search_path` para incluir `extensions` (recomendação do linter de segurança do Supabase).

### Mudanças

**Nova migração** ajustando duas funções:

1. `public.create_passagens_share_link(_token, _nome, _password, _expires_at)`
   - Trocar `crypt(_password, gen_salt('bf'))` por `extensions.crypt(_password, extensions.gen_salt('bf'))`
   - Manter resto da lógica (permissão via `can_manage_passagens_share`, insert na tabela).

2. `public.get_passagens_via_token(_token)` / `verify_passagens_share_link` (a que usa `crypt(_password, link_rec.password_hash)` na migration `20260426201410`)
   - Trocar para `extensions.crypt(_password, link_rec.password_hash)`.

### Resultado

- Criação de link com senha volta a funcionar.
- Verificação de senha em links compartilhados (`/passagens-aereas/compartilhado?token=...&p=1`) continua funcionando.
- Sem alterações no frontend.
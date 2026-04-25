# Plano: Login exclusivo via Microsoft Entra ID (single-tenant)

## Objetivo

Substituir totalmente o login email/senha pelo login com **Microsoft Entra ID** (Azure AD), restrito a **um único tenant** corporativo, usando fluxo OAuth/OIDC implementado em Edge Function.

## Pré-requisitos que dependem de você

Você precisa criar um **App Registration** no portal Azure (https://portal.azure.com → Microsoft Entra ID → App registrations → New registration) com:

- **Supported account types**: "Accounts in this organizational directory only (single tenant)"
- **Redirect URI** (Web): `https://cpgyhjqufxeweyswosuw.supabase.co/functions/v1/azure-auth-callback`
- Após criar, gerar um **Client Secret** (Certificates & secrets → New client secret)
- Anotar três valores: **Tenant ID**, **Client ID** (Application ID), **Client Secret**

Depois eu vou pedir esses três valores como secrets do projeto (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`).

## Arquitetura

```text
Login Page  →  azure-auth-start (edge fn)  →  login.microsoftonline.com
                                                       ↓
                                           usuário autentica no Entra ID
                                                       ↓
                            azure-auth-callback (edge fn) recebe code+state
                                                       ↓
                  troca code por id_token, valida tenant, cria/sincroniza
                  usuário no Supabase Auth via service_role e gera magic link
                                                       ↓
                         redireciona browser para magic link → sessão ativa
```

## Mudanças

### 1. Edge functions novas (sem JWT)

- **`supabase/functions/azure-auth-start/index.ts`**: gera `state` (CSRF) + `nonce`, monta URL `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize` com `client_id`, `response_type=code`, `scope=openid email profile`, `redirect_uri` (a callback), e devolve a URL para o frontend.
- **`supabase/functions/azure-auth-callback/index.ts`**:
  1. Recebe `code` + `state` do redirect do Azure.
  2. Troca `code` por tokens em `https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token`.
  3. Decodifica `id_token` (JWT) e valida `tid === AZURE_TENANT_ID`, `aud === client_id`, `iss` apontando para o tenant correto, `exp` válido.
  4. Extrai `email` e `name` (`preferred_username`/`upn`).
  5. Usa `service_role` para `admin.listUsers` → se não existir, cria com `admin.createUser({ email, email_confirm: true, user_metadata: { provider: 'azure', name } })`.
  6. Cria um magic link via `admin.generateLink({ type: 'magiclink', email })` e redireciona o browser para essa URL — Supabase consome o token e ativa a sessão.

Ambas declaradas em `supabase/config.toml` com `verify_jwt = false`.

### 2. Tela de login

`src/pages/LoginPage.tsx` reescrita: remover formulário email/senha e link "cadastre-se". Botão único **"Entrar com Microsoft"** que invoca `azure-auth-start` e faz `window.location.href = data.url`.

### 3. Página de callback no front

`src/pages/AuthCallback.tsx` (rota `/auth/callback`): trata o retorno do magic link consumido pelo Supabase (token no hash da URL), chama `supabase.auth.getSession()` e redireciona para `/estoque`. Adicionar a rota em `App.tsx`.

### 4. Limpeza no AuthContext

`src/contexts/AuthContext.tsx`: remover `login` e `signup` (ainda chamados pelo LoginPage). Manter apenas `logout`, `session`, `user` e o carregamento de `profile` que já existe.

### 5. Aprovação e perfil

O fluxo de aprovação atual permanece intacto:
- Trigger `handle_new_user` cria a linha em `profiles` (já está em produção).
- Novo usuário entra como `approved=false` e vê a tela "Acesso Pendente" até um admin aprovar e vincular o `erp_user`.
- Apenas administradores existentes podem vincular acesso (corrigido na migration anterior).

## Limitações importantes

- **Não há mais cadastro próprio** — só consegue entrar quem existe no tenant Azure configurado. Usuários atuais que estão como email/senha precisam:
  1. Existir no tenant Azure (mesmo email).
  2. Fazer o primeiro login via Microsoft — uma nova entrada em `auth.users` será criada **com mesmo email** se o atual não tiver sido criado por OIDC. Para preservar permissões, o admin pode reapontar o `erp_user` do `profiles` antigo para o novo `auth.uid()` se necessário.
- O HIBP que ativamos antes deixa de ter efeito prático (sem senhas no app), mas fica ligado sem custo.
- Recuperação de senha some da UI (Microsoft cuida disso).
- Restrito a **1 tenant** — qualquer token de outro tenant é rejeitado na callback com 401.

## Validação pós-deploy

1. Acessar `/login`, clicar em "Entrar com Microsoft", autenticar como usuário do tenant → cair em `/estoque` (ou em "Acesso Pendente" se não aprovado).
2. Tentar com conta de outro tenant → erro de tenant inválido.
3. Logout e novo login funcionam.
4. Admin existente continua administrador (mesmo email no Azure).

## Tarefas que serão executadas

1. Pedir os três secrets via `add_secret` (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) — **só prossigo depois que você adicionar**.
2. Criar as duas edge functions e o `config.toml` com `verify_jwt = false`.
3. Reescrever `LoginPage.tsx`, criar `AuthCallback.tsx`, registrar rota.
4. Limpar `AuthContext`.
5. Smoke test guiado.

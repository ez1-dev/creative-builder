# Plano: Corrigir Falhas Críticas de Segurança (RLS + HIBP)

## Contexto

A varredura de segurança identificou três problemas, sendo um **crítico** que permite escalada de privilégios para administrador por qualquer usuário anônimo.

### Falhas a corrigir

1. **CRÍTICO — Escalada de privilégio em `user_access` e `access_profiles`**
   As duas tabelas hoje têm policy `ALL` com `USING: true / WITH CHECK: true`, permitindo que qualquer um (até não autenticado) insira/edite/apague registros. Como `is_admin()` decide o admin lendo justamente dessas tabelas, um atacante pode se autopromover a `Administrador` e ganhar acesso total a `profiles`, `error_logs`, `user_sessions`, `user_activity`, `user_preferences` e `user_search_history`.

2. **Leitura pública das tabelas de acesso**
   `user_access` e `access_profiles` são lidas sem autenticação, expondo a estrutura de autorização. O frontend (`AuthContext`, `useUserPermissions`) já consulta essas tabelas como usuário autenticado, então restringir leitura a `authenticated` não quebra nada.

3. **Leaked Password Protection desativada (HIBP)**
   Recurso do Lovable Cloud que bloqueia senhas vazadas em signup/troca de senha.

A tabela `profile_screens` também tem a mesma policy permissiva `ALL true/true`. Será corrigida no mesmo sweep para consistência (impacta menos, mas é abusável: usuário poderia se conceder acesso a telas que não deveria ver).

## Mudanças de banco (migration)

Para cada uma das três tabelas (`access_profiles`, `user_access`, `profile_screens`):

1. `DROP POLICY` da policy `ALL` permissiva atual.
2. `CREATE POLICY` somente de **SELECT** para `authenticated` (`USING true`) — necessário para o frontend ler perfis e permissões do usuário logado.
3. `CREATE POLICY` de **ALL** restrito a admins, usando `is_admin(auth.uid())` em `USING` e `WITH CHECK`. Assim apenas administradores existentes podem alterar perfis/acessos via UI de Configurações.

Nota técnica: `is_admin()` já é `SECURITY DEFINER` com `search_path` fixado, então não há recursão de RLS quando consultado dentro das próprias policies dessas tabelas.

## Configuração de Auth

Ativar **Leaked Password Protection (HIBP)** no Lovable Cloud via `configure_auth` com `password_hibp_enabled: true`. Isso valida senhas contra a base Have I Been Pwned no signup e nas trocas de senha, sem alteração no frontend.

## Verificação pós-aplicação

- Login e signup continuam funcionando (rota `/login`).
- Usuário aprovado consegue ler suas permissões (`useUserPermissions` retorna telas).
- Tela de Configurações (gestão de perfis/acessos) continua operando para administradores; usuários comuns recebem erro de RLS ao tentar gravar (comportamento desejado).
- Tentativa anônima de `INSERT` em `access_profiles`/`user_access` é rejeitada.
- Re-rodar o scan de segurança: as duas findings de `user_access` ficam resolvidas e o aviso de HIBP some.

## Itens fora deste plano

- `SUPA_extension_in_public` e `SUPA_rls_policy_always_true` (warnings) — o segundo será naturalmente resolvido pela migração acima nas três tabelas; o primeiro é um aviso informativo do Supabase sobre extensões em `public` e não exige ação imediata.
- Documentos do backend FastAPI do Faturamento Genius já entregues em `docs/backend-faturamento-genius-PATCH.md` permanecem inalterados.

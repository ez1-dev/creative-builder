

# Implementar Login com Lovable Cloud

## Resumo
Adicionar autenticação via Lovable Cloud (email/senha) como controle de acesso principal. O login ERP existente continua funcionando independentemente para chamadas à API.

## Alterações

### 1. Criar tabela `profiles` (migração)
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  erp_user text, -- vincula ao user_login do sistema de permissões
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'email');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Atualizar `AuthContext.tsx`
- Substituir autenticação ERP por Supabase Auth (`signInWithPassword`, `signUp`, `signOut`)
- Usar `onAuthStateChange` para gerenciar sessão
- Manter o campo `usuario` lendo do perfil ou do `erp_user` para compatibilidade com permissões
- Expor funções `login`, `signup`, `logout`

### 3. Refatorar `LoginPage.tsx`
- Formulário com email/senha usando Supabase Auth
- Adicionar opção de cadastro (signup)
- Manter painel de configuração da URL da API ERP
- Manter indicador de status da API

### 4. Atualizar `AppLayout.tsx`
- Verificar sessão Supabase em vez de token ERP
- Exibir email ou display_name do usuário logado

### 5. Atualizar `useUserPermissions.ts`
- Buscar `erp_user` do perfil Supabase para vincular às permissões
- Usar o campo `erp_user` da tabela `profiles` no lugar de `usuario` do AuthContext

### 6. Manter `api.ts` intacto
- O `ApiClient` continua funcionando para chamadas à API ERP
- O token ERP pode ser configurado separadamente se necessário

## Fluxo
```text
Usuário → Login com email/senha (Lovable Cloud)
       → Sessão Supabase ativa
       → Perfil carregado (profiles.erp_user = "RENATO")
       → Permissões consultadas via user_access/profile_screens
       → Sidebar filtrado conforme permissões
       → Chamadas à API ERP usam token ERP independente
```

## Seção Técnica
- Supabase Auth com email/senha (sem auto-confirm, usuário confirma email)
- Tabela `profiles` com trigger automático
- O campo `erp_user` na tabela `profiles` faz a ponte entre o auth Cloud e o sistema de permissões existente
- RLS na tabela profiles restrito ao próprio usuário


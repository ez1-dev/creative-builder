

# Fix: Email não aparece na aprovação de usuários

## Problema
O trigger `handle_new_user` salva o email usando `NEW.raw_user_meta_data->>'email'`, mas o signup não envia o email nos metadados — ele está disponível em `NEW.email`. Por isso, o campo `email` na tabela `profiles` fica `NULL`.

## Solução

### 1. Migração SQL
Atualizar a função `handle_new_user` para usar `NEW.email` (que é o campo correto da tabela `auth.users`):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
```

### 2. Corrigir registros existentes sem email
Atualizar os perfis que já existem e estão com email NULL, buscando o email correto da tabela `auth.users`:

```sql
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
```

### Resultado
- Novos cadastros terão o email salvo corretamente
- Registros antigos sem email serão corrigidos
- A tela de aprovações mostrará o email normalmente


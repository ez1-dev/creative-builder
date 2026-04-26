## Diagnóstico do bug

O erro **"Senha incorreta. Tente novamente."** no link de compartilhamento de Passagens Aéreas é causado por uma incompatibilidade entre o frontend e a função SQL `validate_share_token`:

- **Frontend** (`ShareLinksDialog.tsx`): grava no banco `token = SHA-256(publicToken + "::" + senha)` e marca `password_hash = 'protected'` (string literal sentinela — a senha em si nunca é salva, fica embutida no hash do token).
- **Função SQL** (`validate_share_token`): quando vê `password_hash IS NOT NULL`, tenta validar via `crypt(_password, link_rec.password_hash)`. Como `password_hash` é a string `'protected'` (não um hash bcrypt válido) **e** o frontend chama o RPC sem passar `_password`, a função retorna `false` e o frontend mostra "Senha incorreta".

O cálculo do token efetivo no frontend (`deriveEffectiveToken`) já garante que o token só vai bater com o registro se a senha estiver correta. Logo, **basta o token bater** para considerar a senha válida.

## Correção (uma migração SQL)

Reescrever `public.validate_share_token` para tratar `password_hash = 'protected'` como sentinela: nesse caso, o match do token já é prova de senha correta — pular `crypt()`. Para qualquer outro valor de `password_hash` (compatibilidade futura com bcrypt real), mantém a verificação atual.

```sql
CREATE OR REPLACE FUNCTION public.validate_share_token(_token text, _password text DEFAULT NULL)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.passagens_aereas_share_links
  WHERE token = _token AND active = true LIMIT 1;
  IF link_rec IS NULL THEN RETURN false; END IF;
  IF link_rec.expires_at IS NOT NULL AND link_rec.expires_at < now() THEN RETURN false; END IF;
  IF link_rec.password_hash IS NOT NULL AND link_rec.password_hash <> 'protected' THEN
    IF _password IS NULL OR crypt(_password, link_rec.password_hash) <> link_rec.password_hash THEN
      RETURN false;
    END IF;
  END IF;
  RETURN true;
END;
$$;
```

## Impacto

- Links **com senha** existentes voltam a funcionar imediatamente após a migração.
- Links **sem senha** continuam funcionando exatamente como hoje (sem mudança).
- Sem mudança no frontend e sem perda de segurança: a senha continua sem ser armazenada em texto plano nem em hash recuperável; ela só existe embutida no token efetivo, que só quem tem o link + senha consegue reconstruir.

## Arquivos alterados

- 1 migração SQL nova em `supabase/migrations/`.
- Nenhum arquivo do frontend muda.

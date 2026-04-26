## Diagnóstico

O erro `AADSTS700016` significa que o Azure não encontrou o Client ID `22a1a52a-...` no tenant que estamos usando como authority. O código atual já monta a URL como `https://login.microsoftonline.com/${AZURE_TENANT_ID}/...`, então o valor armazenado hoje no secret `AZURE_TENANT_ID` está apontando para um tenant errado (provavelmente um diferente do "Estrutural Zortéa", que é onde o App Registration vive).

O tenant correto é: `15b289b8-79a4-49f8-93de-904f7e233a25`.

## Correções

### 1. Atualizar o secret `AZURE_TENANT_ID`
Via `update_secret`, definir `AZURE_TENANT_ID = 15b289b8-79a4-49f8-93de-904f7e233a25`. Esta é a correção principal — sem isso nenhuma mudança de código resolve.

### 2. Reforçar no código (defesa em profundidade)
Em `supabase/functions/azure-auth-start/index.ts` e `supabase/functions/azure-auth-callback/index.ts`:

- Definir uma constante `EXPECTED_TENANT_ID = "15b289b8-79a4-49f8-93de-904f7e233a25"`.
- Usar essa constante diretamente em todas as URLs (`/authorize`, `/token`, validação de `iss` e `tid` no `id_token`), independentemente do valor do env var.
- Manter a leitura do env apenas para sanity check / log se divergir.

Isso garante que mesmo se o secret estiver errado novamente, o fluxo continua apontando para o tenant correto. Não usar `/common` nem `/organizations` em hipótese alguma.

### 3. Validar
Após o redeploy automático das funções:
1. Acessar `/login` → "Entrar com Microsoft".
2. Confirmar que a URL da Microsoft contém `/15b289b8-79a4-49f8-93de-904f7e233a25/oauth2/v2.0/authorize`.
3. Concluir o login com uma conta do tenant Zortéa.
4. Cair em `/auth/callback` e depois em `/estoque` (ou "Acesso Pendente").

## Pré-requisito do lado Azure

Confirmar no portal Azure (tenant Estrutural Zortéa) que o App Registration `22a1a52a-c4a4-48fc-a868-a1e5a49b9b44` tem como **Redirect URI (Web)**:

`https://cpgyhjqufxeweyswosuw.supabase.co/functions/v1/azure-auth-callback`

Se essa URI não estiver cadastrada exatamente assim, o callback falha mesmo com o tenant correto.

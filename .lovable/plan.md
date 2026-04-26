## Diagnóstico

O print do Azure mostra que o Client ID real do App Registration "EZ ERP SAPIENS IA" no tenant Estrutural Zortéa é:

`22a1a32a-c4a4-48fc-a868-a1e5a49b9b44`

O valor atualmente armazenado no secret `AZURE_CLIENT_ID` é:

`22a1a52a-c4a4-48fc-a868-a1e5a49b9b44`

A diferença é o terceiro grupo (`32a` vs `52a`). Por isso o Azure responde `AADSTS700016` — ele está procurando um app que não existe.

## Correções

### 1. Atualizar o secret `AZURE_CLIENT_ID`
Via `update_secret`, definir:
- `AZURE_CLIENT_ID = 22a1a32a-c4a4-48fc-a868-a1e5a49b9b44`

Manter inalterado:
- `AZURE_TENANT_ID = 15b289b8-79a4-49f8-93de-904f7e233a25`
- `AZURE_CLIENT_SECRET` (o mesmo já cadastrado, contanto que tenha sido gerado para esse mesmo app no portal)

### 2. Redeploy das edge functions
Forçar redeploy de `azure-auth-start` e `azure-auth-callback` para garantir que peguem o novo valor do secret.

### 3. Validar
1. Abrir `/login` em aba anônima.
2. Clicar em "Entrar com Microsoft".
3. Conferir que a URL gerada contém `client_id=22a1a32a-c4a4-48fc-a868-a1e5a49b9b44` e `/15b289b8-.../oauth2/v2.0/authorize`.
4. Concluir o login com uma conta do tenant Zortéa.
5. Cair em `/auth/callback` e em seguida `/estoque` (ou tela "Acesso Pendente" se ainda não aprovado).

## Observação

Nenhuma alteração de código é necessária — as edge functions já usam o tenant fixo correto e leem o Client ID do secret. A correção é exclusivamente no valor do secret + redeploy.

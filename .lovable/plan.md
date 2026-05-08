# Corrigir layout do link compartilhado (senha)

## Problema

Quando o link tem senha, o dashboard público mostra o layout padrão em vez do layout salvo pelo administrador.

Motivo: na hora de criar o link com senha, o que vai para a coluna `token` é o `effectiveToken` (`SHA-256(publicToken + senha)`), enquanto a URL compartilhada carrega o `publicToken`. A RPC `get_passagens_layout_via_token` recebe o token da URL, não encontra a linha pelo `effectiveToken`, falha em `validate_share_token` e o hook cai no fallback `PASSAGENS_DEFAULT_WIDGETS`.

## Correção

Carregar o layout usando o **mesmo token efetivo** que já é usado para carregar os dados — ou seja, só depois que o usuário digita a senha (ou imediatamente, quando não há senha).

### Arquivo: `src/pages/PassagensAereasCompartilhadoPage.tsx`

- Adicionar `effectiveToken` no estado, inicializando como `null`.
- Quando `requiresPassword === false`: setar `effectiveToken = token` ao montar.
- Em `handlePasswordSubmit` (e em `loadData`): após calcular `effective`, fazer `setEffectiveToken(effective)`.
- Passar `shareToken={effectiveToken ?? token}` para `<PassagensDashboard>` (em vez de `token`). Como o componente só é renderizado quando `state === 'ok'`, `effectiveToken` já estará definido nesse ponto.

### Sem mudanças no hook nem no banco

`usePassagensLayout` e a RPC continuam iguais. A correção é apenas o token correto chegar ao hook.

## Validação

1. Criar link **sem senha** como admin, ajustar layout, salvar, abrir o link em aba anônima → layout deve refletir o ajuste (já funciona, garantir que continua).
2. Criar link **com senha**, ajustar layout, salvar, abrir em aba anônima e digitar a senha → layout agora deve refletir o ajuste do admin.
3. Senha errada continua barrando acesso (a RPC de dados ainda valida).

## Fora do escopo

- Não mexer nas regras de RLS, na RPC pública ou no fluxo de geração de link.
- Não mexer em `usePassagensLayout`, `PassagensDashboard` ou `PassagensLayoutGrid`.

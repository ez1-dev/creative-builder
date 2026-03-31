

# Remover Confirmação de Email no Cadastro

## O que será feito
Desativar a verificação de email no cadastro, permitindo que novos usuários façam login imediatamente após se registrar (ainda precisarão de aprovação do admin).

## Passos

1. **Configurar auto-confirm de email** — Usar a ferramenta `cloud--configure_auth` para ativar `autoconfirm` de emails, eliminando a necessidade de verificação por email.

2. **Atualizar mensagem de cadastro no `LoginPage.tsx`** — Remover a parte "Verifique seu email" da mensagem de sucesso, mantendo apenas o aviso sobre aprovação do administrador.


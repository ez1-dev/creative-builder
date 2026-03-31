

# Corrigir erro "Sessão da API ERP expirada" para usuários sem `erp_user`

## Diagnóstico

O usuário `renatostank@gmail.com` tem `erp_user = NULL` no banco. Sem esse campo preenchido, o login automático na API ERP é ignorado, e qualquer consulta de dados falha com 401.

Já o `renato.stank@unoesc.edu.br` tem `erp_user = RENATO.STANK@UNOESC.EDU.BR` — mas o login automático está falhando com "Login inválido" (visível nos logs do console). Provavelmente esse valor não é um usuário válido na API ERP externa.

## Opções

Há duas abordagens possíveis:

### Opção A — Corrigir os dados (recomendado se esses usuários devem ter acesso ao ERP)
- Atribuir o `erp_user` correto para `renatostank@gmail.com` via Configurações → Aprovações
- Corrigir o `erp_user` de `renato.stank@unoesc.edu.br` para um login válido na API ERP (ex: `RENATO` em vez de `RENATO.STANK@UNOESC.EDU.BR`)

### Opção B — Melhorar o tratamento no código (recomendado como melhoria geral)
Nas páginas de consulta (Estoque, Onde Usa, etc.), antes de chamar a API ERP, verificar se o usuário tem `erp_user` configurado. Se não tiver, exibir uma mensagem amigável como:

> "Seu usuário ERP não está configurado. Solicite a um administrador que vincule seu usuário nas Configurações."

**Alterações:**
1. **`src/contexts/AuthContext.tsx`** — Expor um flag `erpConnected` (true se login ERP automático foi bem-sucedido)
2. **Páginas de consulta** (EstoquePage, OndeUsaPage, etc.) — Verificar `erpConnected` ou `erpUser` antes de fazer chamadas à API, mostrando alerta informativo em vez de erro genérico

## Recomendação

Implementar **ambas**: corrigir os dados imediatos e adicionar a verificação no código para que futuros usuários sem `erp_user` vejam uma mensagem clara.


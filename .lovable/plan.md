

# Restringir Configuração de API ao Administrador na Tela de Login

## Problema
Atualmente, todos os usuários veem o status da API, a URL e o botão "Configurar API" na tela de login. Isso deve ser visível apenas para administradores.

## Abordagem
Como na tela de login o usuário ainda não está autenticado, usaremos um flag em `localStorage` (`erp_is_admin`) que é setado quando um administrador faz login com sucesso. Na próxima vez que a tela de login for exibida (ex: após logout), o flag determina se a seção de API aparece.

## Alterações

### 1. `src/contexts/AuthContext.tsx`
- Após login bem-sucedido e carregamento do perfil, verificar se o `erp_user` do perfil tem um registro em `user_access` vinculado a um perfil com nome "Administrador"
- Se sim, salvar `localStorage.setItem('erp_is_admin', 'true')`
- No logout, remover o flag: `localStorage.removeItem('erp_is_admin')`

### 2. `src/pages/LoginPage.tsx`
- Ler `localStorage.getItem('erp_is_admin') === 'true'` para determinar visibilidade
- **Esconder** toda a seção de API (status badge, URL, botão "Configurar API" e o painel de config) quando o flag não estiver presente
- Manter o `checkApi()` rodando internamente para que a API esteja configurada, mas sem exibir nada ao usuário comum

### Fluxo
```text
Admin faz login → perfil carregado → flag 'erp_is_admin' salvo
Admin faz logout → tela de login mostra seção de API
Usuário comum faz login → sem flag → tela de login limpa (sem info de API)
```

## Detalhes Técnicos
- O flag em localStorage é apenas para controle de UI na tela de login (não é segurança crítica, pois a configuração da URL da API não dá acesso a dados protegidos)
- A verificação de admin usa a tabela `user_access` + `access_profiles` onde `name = 'Administrador'`


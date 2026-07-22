## Objetivo
Permitir controlar o acesso à tela **DRE Padrão** pela Central de Liberações (aba Configurações › Acessos › Telas & Menus e overrides por usuário), exatamente como já funciona para DRE Studio, Balanço, etc.

## Diagnóstico
- A rota `/contabilidade/dre-padrao` já está protegida por `ProtectedRoute path="/contabilidade/dre-padrao"` em `src/App.tsx` (linha 201).
- Porém a tela **não aparece** na lista `ALL_SCREENS` de `src/pages/ConfiguracoesPage.tsx` (linhas 36-56), então não é possível liberar/bloquear por perfil ou por usuário na UI de permissões.

## Mudança
1. Em `src/pages/ConfiguracoesPage.tsx`, adicionar uma nova entrada em `ALL_SCREENS` logo abaixo de `/contabilidade/dre-studio/modelos/novo`:

   ```ts
   { path: '/contabilidade/dre-padrao', name: 'Contabilidade — DRE Padrão' },
   ```

Nada mais precisa mudar: o `ProtectedRoute` já lê esse path, os toggles de perfil (`profile_screens`) e os overrides por usuário (`user_screen_overrides`) passam a funcionar automaticamente para a DRE Padrão. O item do menu lateral (`menuCatalog.ts`) já é filtrado pela mesma verificação.

## Como validar
- Abrir Configurações › Acessos › Telas & Menus e confirmar que **"Contabilidade — DRE Padrão"** aparece na lista, permitindo liberar/bloquear por perfil.
- Em Configurações › Usuários › (usuário) › Overrides de tela, o item também deve aparecer.
- Bloquear para um perfil de teste e confirmar que o usuário perde acesso a `/contabilidade/dre-padrao` e o item some do menu.

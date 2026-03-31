

# Mover Configuração de API para a Página de Configurações

## Objetivo
Remover a seção de configuração da API da tela de login e adicioná-la como uma nova aba na página de Configurações (`/configuracoes`).

## Alterações

### 1. `src/pages/ConfiguracoesPage.tsx`
- Adicionar nova aba **"API"** (com ícone `Wifi`) ao `TabsList` existente
- O conteúdo da aba terá:
  - Status da API (badge Online/Offline/Verificando)
  - URL atual da API exibida
  - Campo para editar a URL com botões "Salvar" e "Resetar"
- Reutilizar a mesma lógica de `checkApi`, `handleSaveUrl` e `handleResetUrl` que está no LoginPage

### 2. `src/pages/LoginPage.tsx`
- Remover toda a seção condicional `{isAdmin && (...)}` (linhas 142-195)
- Remover imports não mais utilizados: `Settings`, `Wifi`, `WifiOff`, `Badge`
- Remover estados: `showConfig`, `apiUrl`, `apiStatus`
- Remover funções: `checkApi`, `handleSaveUrl`, `handleResetUrl`
- Remover a variável `isAdmin`
- Manter o `getApiUrl` import pois pode ser usado internamente, ou removê-lo se não for mais necessário

### Resultado
A tela de login fica limpa (apenas email/senha), e a configuração da API fica acessível apenas para administradores via Configurações, que já é uma rota protegida por `AdminRoute`.


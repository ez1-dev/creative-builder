# Personalização da navegação (menus e páginas)

Permitir que cada usuário (ou admin, global) configure quais páginas aparecem em cada menu da sidebar e oculte páginas que não quer ver.

## O que será construído

### 1. Tela "Personalizar menus" (`/configuracoes/menus`)
- Lista todos os grupos de menu da sidebar (ex.: BI, Produção, ERP Nativo, Configurações...).
- Para cada grupo:
  - Reordenar páginas (drag-and-drop).
  - Mover uma página para outro grupo (dropdown "Mover para...").
  - Alternar visibilidade (switch "Ocultar").
  - Criar novo grupo customizado e renomear/excluir grupos criados pelo usuário.
- Botões: **Salvar**, **Restaurar padrão**.

### 2. Escopo da personalização
Duas opções — pergunto abaixo qual você prefere:
- **Por usuário**: cada login tem seu próprio layout de menu.
- **Global (admin)**: um admin define o layout que vale para todos; usuários comuns só consomem.
- **Híbrido**: admin define o padrão da empresa e cada usuário pode ajustar em cima.

### 3. Armazenamento
Nova tabela no backend (Lovable Cloud) `menu_preferences` guardando por usuário (ou global) o JSON com a estrutura `[{ grupo, ordem, paginas: [{ id, ordem, oculto }] }]`. RLS: usuário só lê/escreve o próprio registro; admin escreve o global.

### 4. Sidebar dinâmica
`AppSidebar` passa a montar os grupos/itens a partir de um hook `useMenuLayout()` que:
- Carrega o catálogo padrão de páginas (fonte da verdade em `src/config/menuCatalog.ts`).
- Mescla com a preferência salva (ordem + ocultos + realocações).
- Faz fallback para o padrão se não houver preferência.
Páginas ocultas continuam acessíveis via URL direta (só somem do menu) — a menos que você queira bloquear também (ver pergunta abaixo).

### 5. Atalho de acesso
Ícone de engrenagem no rodapé da sidebar → abre `/configuracoes/menus`.

## Detalhes técnicos

- Catálogo central `menuCatalog.ts` com todas as rotas atuais tipadas (`id`, `label`, `icon`, `url`, `grupoPadrao`).
- Migração SQL cria `public.menu_preferences (user_id uuid pk, layout jsonb, updated_at)` + GRANTs + RLS + política `auth.uid() = user_id`. Se escolher global, adiciono também `menu_preferences_global` com política via `has_role(auth.uid(), 'admin')`.
- Drag-and-drop com `@dnd-kit/core` (já leve, sem dependências pesadas).
- Sidebar existente continua com `collapsible="icon"`; nenhuma quebra nas rotas.

## Perguntas antes de implementar

1. **Escopo**: personalização por usuário, global (admin define para todos) ou híbrido?
2. **Páginas ocultas**: ficam apenas fora do menu (acessíveis por URL) ou também bloqueadas na rota?
3. Quer poder **criar novos grupos** próprios (ex.: "Meus favoritos") ou só reorganizar os existentes?

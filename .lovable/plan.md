Refinar visual e usabilidade das 3 abas em `/configuracoes`: **Perfis de Acesso**, **Permissões por Tela** e **Usuários**. Apenas frontend/UI — nenhuma mudança em backend, schema ou lógica de permissão.

## Arquivos

- `src/pages/ConfiguracoesPage.tsx` — abas `profiles`, `permissions` e `users`.
- `src/components/configuracoes/PermissoesPorTelaPanel.tsx` — refinos visuais e filtros da matriz.

## 1. Aba "Perfis de Acesso"

- Header da aba com título, subtítulo descritivo e mini-cards de KPIs (Total de perfis · Total de telas configuradas · Total de usuários).
- Toolbar: busca por nome/descrição, filtro IA (todos / com IA / sem IA), ordenação (nome / mais usuários / mais telas).
- Tabela: ícone Shield no nome, badge "IA" quando `ai_enabled`, hover destacado, badges semânticos para contagem (zero = `outline`, > 0 = `secondary`), ações em ghost icon com tooltip.
- Estado vazio com ícone, texto orientativo e CTA "Criar primeiro perfil".

## 2. Aba "Permissões por Tela"

- Toolbar: busca por nome/path de tela, filtro por módulo (derivado do prefixo do path), filtro "somente com permissão / todas".
- Agrupamento por módulo com cabeçalhos colapsáveis e contador "X de Y telas liberadas".
- Ações em massa por módulo: "Liberar Ver todas" / "Bloquear todas" para o perfil atualmente focado.
- Sticky header da matriz para rolagem longa.
- Cards laterais (Assistente IA + Compartilhamento Passagens) reformatados como `Card` próprios com ícone, separados visualmente do bloco principal.

## 3. Aba "Usuários"

- Header com KPIs: Usuários atribuídos · Perfis distintos em uso · Usuários ERP aprovados sem atribuição.
- Toolbar: busca por login, filtro por perfil (multi-select), filtro "sem perfil atribuído".
- Tabela: avatar/inicial do login, badges de perfis com cor consistente derivada do nome (tokens semânticos), data formatada `dd/MM/yyyy HH:mm`, ação principal "Editar perfis" (abre o Dialog em modo edição pré-preenchido) e ação secundária "Remover todos".
- Dialog "Atribuir Acesso" com `Combobox` para o usuário (busca por nome/login/email) substituindo o Select longo, e checkboxes de perfis com descrição ao lado.

## Padrão visual (todas as 3 abas)

- Apenas tokens do design system (`bg-card`, `text-muted-foreground`, `border`, `primary`, `accent`). Sem cores hardcoded.
- Header de cada aba em bloco com ícone grande, título, descrição e KPIs em mini-cards à direita.
- Inputs/Selects `h-9`, gaps consistentes, divisores sutis, estados vazios padronizados.

## Fora do escopo

- Schema, RPCs, edge functions — inalterados.
- Demais abas (Visuals, API, Logs, Monitoramento, Aprovações, Versão, Documentação, etc.) — inalteradas.
- Catálogo `ALL_SCREENS` — inalterado.
- Lógica de carregamento (`fetchData`), salvamento e RLS — inalterada.
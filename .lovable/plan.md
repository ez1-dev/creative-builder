## Objetivo
Adicionar uma nova aba **"Mapa de Acessos"** em Configurações › Acessos, com uma matriz heatmap **usuários × itens** cobrindo Telas & Menus, Funcionalidades e Integrações — para visualizar rapidamente quem tem acesso a quê.

## Onde
- Nova aba dentro de `src/pages/ConfiguracoesPage.tsx` (seção Acessos), ao lado de Perfis / Usuários / Telas & Menus / Liberações.
- Novo componente: `src/components/configuracoes/MapaAcessosPanel.tsx`.

## Fontes de dados (só leitura)
- `profiles` + `user_access` → usuários e seus perfis vinculados.
- `profile_screens` (allow por perfil) + `user_screen_overrides` (allow/deny por usuário) + `ALL_SCREENS` (catálogo já existente em `ConfiguracoesPage.tsx`).
- `profile_features` + `user_feature_overrides` + `FEATURE_CATALOG` (`src/config/featureCatalog.ts`, áreas `funcionalidade`, `integracao`).

Regra de resolução por célula (mesma lógica já usada nos hooks/painéis atuais):
1. Se existir `user_*_override` → vale o override (allow/deny).
2. Senão, `enabled` no `profile_*` do(s) perfil(s) vinculados ao usuário (OR entre perfis).
3. Senão, default do catálogo (telas: bloqueado; features: `default` do `FEATURE_CATALOG`).

## Layout do painel

```text
┌──────────────────────────────────────────────────────────────────┐
│ Filtros: [Busca usuário] [Busca item] [Categoria ▼] [Perfil ▼] │
│          [ ] só bloqueios  [ ] só overrides                     │
├──────────────────────────────────────────────────────────────────┤
│ Abas de categoria: [Telas] [Funcionalidades] [Integrações]      │
├──────────────────────────────────────────────────────────────────┤
│               │ Item 1 │ Item 2 │ Item 3 │ Item 4 │ ...          │
│ user A (P1)   │   ●    │   ●    │   ○    │   ◐    │              │
│ user B (P2)   │   ●    │   ○    │   ●    │   ●    │              │
│ user C (P1,3) │   ◐    │   ●    │   ●    │   ○    │              │
└──────────────────────────────────────────────────────────────────┘

Legenda: ● liberado  ○ bloqueado  ◐ override (borda destacada)
```

- Linhas fixas (sticky) para nome do usuário + chips dos perfis; primeira coluna sticky à esquerda.
- Cabeçalho de colunas sticky no topo, rotacionado 45–90° quando lista longa (tooltip com nome completo).
- Célula = quadradinho colorido: verde (liberado), vermelho suave (bloqueado), anel/borda azul quando é override manual do usuário.
- Hover na célula: tooltip "Origem: perfil X / override / default" + botão "Ir para Liberações".
- Rodapé com contadores: total usuários, total itens, % de acessos liberados na visão atual.
- Botão **Exportar XLSX** da matriz atual (usa `xlsx`, mesmo padrão já usado no DRE).
- Painel scrollável horizontal usando o `FloatingHScrollbar` já existente (`src/components/common/FloatingHScrollbar.tsx`).

## Interações
- Click na célula → abre popover com detalhes (perfis contribuintes, override atual) e link "Editar em Liberações / Telas & Menus" (navega para a aba correspondente já selecionando o usuário e o item).
- Filtro "Categoria" restringe grupos (ex.: só telas de "Contabilidade", só features do grupo "DRE").
- Filtro "Perfil" filtra os usuários que pertencem ao perfil escolhido.
- Toggle "só bloqueios" e "só overrides" para achar problemas rapidamente.

## Detalhes técnicos
- Uma única query paralela (`Promise.all`) para: `user_access`, `profiles`, `profile_screens`, `user_screen_overrides`, `profile_features`, `user_feature_overrides`. Cache com React Query (`queryKey: ['mapa-acessos']`), `staleTime: 60_000`.
- Cálculo da matriz em `useMemo` (agrupando por login para consolidar múltiplos perfis).
- Sem migrações — usa apenas tabelas existentes com as RLS já configuradas (`can_manage_liberacoes`).
- Reaproveita `ALL_SCREENS` e `FEATURE_CATALOG` para os cabeçalhos das colunas (garante que qualquer nova tela/feature já aparece no mapa automaticamente).
- Somente leitura — a edição continua feita nos painéis existentes.

## Como validar
- Configurações › Acessos › nova aba **Mapa de Acessos** aparece.
- Alterar um `profile_screens` ou criar um `user_screen_overrides` num outro painel e voltar ao mapa (refetch): a célula reflete a mudança e ganha o anel de "override" quando aplicável.
- Filtros "só bloqueios" e "só overrides" restringem a matriz.
- Exportar XLSX gera planilha com usuários nas linhas e itens nas colunas.

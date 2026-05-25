# Redesign — Permissões por Tela

Substituir a matriz larga (telas × perfis × Ver/Editar) por um layout **focado em uma tela por vez**, mais legível e auditável.

## Layout proposto

Card "Permissões por Tela" passa a ter dois painéis lado a lado dentro de um grid responsivo:

```text
┌────────────────────────────┬────────────────────────────────────────┐
│ [Buscar tela...]           │  Tela: Faturamento Genius              │
│                            │  Caminho: /faturamento-genius          │
│ ▾ Produção (10)            │  ────────────────────────────────────  │
│   • Dashboard         3/5  │  Ações em lote:                        │
│   • Produzido…        2/5  │  [Liberar Ver p/ todos] [Limpar tudo]  │
│ ▾ Compras (5)              │  [Copiar perfil X → Y ▾]               │
│   • Painel Compras …  4/5  │  ────────────────────────────────────  │
│ ▾ Financeiro (3)           │  Perfil          Ver    Editar         │
│ ▾ BI / Configuração (2)    │  Administrador   [on]   [on]           │
│ …                          │  Gerente Prod.   [on]   [ ]            │
│                            │  Operador        [ ]    [ ]            │
└────────────────────────────┴────────────────────────────────────────┘
```

- Em telas estreitas (<lg) vira layout em uma coluna: lista de telas em cima (collapsable) e detalhe abaixo, com botão "Voltar à lista".

## Painel esquerdo — Lista de telas

- Campo de busca (filtra por nome e por caminho).
- Telas agrupadas por **módulo** em accordions abertos por padrão. Agrupamento derivado do `path`:
  - Produção: `/producao/*`
  - Compras: `/compras-*`, `/painel-compras`, `/demonstrativo-compras-recebimentos`, `/auditoria-tributaria`, `/notas-recebimento`
  - Estoque: `/estoque*`, `/sugestao-min-max`, `/onde-usa`, `/bom`, `/numero-serie`
  - Financeiro/Contábil: `/contas-*`, `/contabilidade/*`, `/conciliacao-edocs`
  - Faturamento: `/faturamento-genius`, `/auditoria-apontamento-genius`
  - Operacional: `/passagens-aereas`, `/frota`, `/manutencao-maquinas`
  - Administração: `/configuracoes`, `/monitor-usuarios-senior`, `/gestao-sgu-usuarios`, `/biblioteca-bi`
  - "Outras" para o que não bater.
- Cada item mostra nome + **badge de contagem** "X/Y" (perfis com `can_view` / total de perfis).
- Item ativo destacado (`bg-accent`). Clique seleciona a tela.

## Painel direito — Detalhe da tela selecionada

- Cabeçalho com nome da tela, caminho em `text-muted-foreground` e badge "N de M perfis com acesso".
- Barra de **ações em lote** (afeta apenas a tela selecionada):
  - "Liberar Ver para todos os perfis"
  - "Liberar Ver + Editar para todos"
  - "Remover todas as permissões"
  - "Copiar de outro perfil…" (dropdown: escolhe perfil origem e perfil destino, copia permissões dessa tela).
- Tabela compacta `Perfil | Ver (Switch) | Editar (Switch)`:
  - `Editar` desabilita quando `Ver` está desligado (regra atual mantida).
  - Toggle reaproveita `toggleScreen` existente; lote chama a mesma função em sequência (ou faz upsert único em batch para performance).
- Estado vazio quando nenhuma tela está selecionada: instrução "Selecione uma tela à esquerda".

## Secções inferiores

Mantém intactas, sem mudança visual relevante:
- "Assistente IA" (switch por perfil).
- "Compartilhamento de Passagens Aéreas".

## Implementação técnica

Arquivos:

- `src/pages/ConfiguracoesPage.tsx`
  - Extrair o conteúdo da `TabsContent value="permissions"` para um novo componente `PermissoesPorTelaPanel` (mesmo arquivo ou novo módulo) para não inflar a página.
  - Manter `ALL_SCREENS`, `profiles`, `profileScreens`, `getScreenPerm`, `toggleScreen`, `fetchData` como estão (passados via props ou movidos junto).
- Novo arquivo sugerido: `src/components/configuracoes/PermissoesPorTelaPanel.tsx`
  - Props: `profiles`, `profileScreens`, `onToggle(profileId, path, name, field)`, `onBatch(updates)`.
  - Estado interno: `search`, `selectedPath`, `openGroups`.
  - Helper `getModule(path)` mapeia path → módulo.
  - Helper `countViewers(path)` percorre `profileScreens` para o badge.
  - Ações em lote: nova função `applyBulk(path, name, action)` que faz upsert em massa usando `supabase.from('profile_screens').upsert([...], { onConflict: 'profile_id,screen_path' })` e depois chama `fetchData()`. Se a constraint composta não existir, faz fallback iterando `toggleScreen`.
- Componentes UI: usar shadcn `Accordion`, `Input`, `Switch`, `Badge`, `Card`, `ScrollArea`, `DropdownMenu`, `Button`, `Separator`. Sem cores hardcoded — só tokens semânticos (`bg-card`, `bg-accent`, `text-muted-foreground`, `border-border`, `text-primary`).
- Acessibilidade: lista de telas como `role="listbox"`/`button`, switches com `aria-label` ("Liberar visualização", "Liberar edição").

## Fora do escopo

- Schema do banco (`profile_screens` permanece igual).
- Lógica de permissões em `useUserPermissions` e `ProtectedRoute`.
- Outras abas de Configurações.
- Catálogo `ALL_SCREENS` — mantido como está.

## Critério de pronto

- Buscar uma tela filtra a lista esquerda.
- Selecionar uma tela mostra todos os perfis com Ver/Editar.
- Toggle persiste em `profile_screens` (mesmo comportamento atual).
- Botões de lote alteram todos os perfis daquela tela com um único refetch.
- Badge de contagem por tela atualiza após mudanças.
- Layout responsivo: 2 colunas em ≥lg, 1 coluna abaixo.
- Sem rolagem horizontal.

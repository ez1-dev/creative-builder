
# Editor completo de menus

Hoje `Personalizar Menus` só permite mover/ocultar/reordenar sobre um catálogo fixo em `src/config/menuCatalog.ts`. Vamos transformá-lo num editor completo, com dois níveis de configuração:

- **Padrão global** — editável só por admins, vale para todos.
- **Override pessoal** — cada usuário ajusta sobre o padrão global.

## O que passa a ser editável

Para cada menu de topo, subgrupo e item:
- **Título** (renomear)
- **Ícone** (picker com busca sobre a biblioteca Lucide)
- **Visibilidade** (mostrar/ocultar) — já existe
- **Ordem e localização** (mover entre topo/subgrupo) — já existe

Estrutura:
- **Criar novo menu de topo** (leaf, flat ou nested)
- **Criar novo subgrupo** dentro de um menu nested
- **Criar novo item** apontando para:
  - Rota interna existente (autocomplete a partir do catálogo)
  - Rota interna manual (`/algo`, mesmo que ainda não exista — aviso "rota não mapeada")
  - URL externa (`https://…`, abre em nova aba com ícone indicador)
- **Excluir** itens/subgrupos/menus criados pelo usuário (os "de fábrica" só podem ser ocultados, nunca apagados — para não perder acesso a telas do sistema)
- **Restaurar padrão** (limpa override pessoal; admin pode também "resetar global de fábrica")

## Arquitetura

### Catálogo de fábrica (imutável)
`src/config/menuCatalog.ts` continua sendo a fonte da verdade das telas que existem no app. Ganha um `id` estável em cada nó (topo/subgrupo/item) para servir de âncora aos overrides.

### Camada de overrides (nova)

Duas tabelas no Cloud:

**`menu_layout_global`** (uma linha só, editada por admins)
- `id uuid pk`
- `layout jsonb` — árvore completa customizada
- `updated_at`, `updated_by`

**`menu_layout_user`** (uma por usuário)
- `user_id uuid pk` → `auth.users`
- `layout jsonb`
- `updated_at`

RLS:
- `menu_layout_global`: `SELECT` para `authenticated`; `INSERT/UPDATE/DELETE` só para role `admin` (via `has_role`).
- `menu_layout_user`: cada um lê/escreve a própria linha.

Ambas com `GRANT` explícitos e `service_role` liberado.

### Formato do `layout jsonb`

Árvore homogênea de nós:
```json
{ "version": 2,
  "nodes": [
    { "id":"erp", "kind":"nested", "title":"ERP", "icon":"Package", "source":"factory",
      "children":[
        { "id":"erp-faturamento", "kind":"group", "title":"Faturamento", "icon":"Receipt",
          "children":[
            { "id":"bi-comercial", "kind":"item", "title":"BI Comercial", "icon":"BarChart3",
              "target":{ "type":"internal", "url":"/bi/comercial" }, "hidden":false }
          ]
        }
      ]
    },
    { "id":"custom-abc", "kind":"item", "source":"user", "title":"Portal do Cliente",
      "icon":"ExternalLink", "target":{ "type":"external", "url":"https://..." } }
  ]
}
```
- `source: 'factory' | 'user'` marca origem — nós de fábrica não podem ser excluídos, só ocultados/renomeados.
- Merge na leitura: `factory catalog → global override → user override`. Cada camada só grava o **delta** (campos alterados + nós criados).

### Hook `useMenuLayout` (refatorado)
- Carrega `TOP_MENUS` + `menu_layout_global` + `menu_layout_user` (React Query).
- Faz merge e retorna a árvore renderizável.
- Expõe mutations: `renameNode`, `setIcon`, `toggleHidden`, `moveNode`, `createNode`, `deleteNode`, `resetPersonal`, `resetGlobal` (esta última só admin).
- Escreve sempre no escopo ativo (usuário ou global) — a tela permite alternar o "modo de edição".

### `AppSidebar`
Passa a consumir a árvore mesclada em vez de `TOP_MENUS` diretamente. Renderiza `ExternalLink` (target `_blank` + ícone `ArrowUpRight`) para itens externos.

## Nova UI de `PersonalizarMenusPage`

Layout em duas colunas:

```text
┌─────────────────────────────┬──────────────────────────────┐
│ Árvore (drag-drop)          │ Painel de propriedades       │
│  ▸ Início                    │  Título:  [___________]      │
│  ▾ ERP                       │  Ícone:   [🔍 picker]        │
│    ▾ Faturamento             │  Rota:    [/bi/comercial]    │
│      • BI Comercial ✎        │  Tipo:    ○ Interna ○ Ext.   │
│      • Faturamento           │  Visível: [x]                │
│    ▸ Estoque                 │  [Excluir] (só se source=user)│
│  ▸ BI                        │                              │
│  [+ Novo menu de topo]       │                              │
└─────────────────────────────┴──────────────────────────────┘
```

Header da página:
- Toggle **Escopo: [Meu usuário | Padrão global (admin)]** — a aba global só aparece se `has_role(admin)`.
- Botão **Restaurar padrão** (do escopo ativo).
- Aviso quando há override pessoal cobrindo o global ("Você tem 3 personalizações locais — [ver] [limpar]").

Drag & drop com `@dnd-kit` (já usado em outros builders do projeto — se não estiver, adicionar). Suporta mover entre topos e subgrupos.

Diálogos:
- **Criar item**: título, ícone, tipo de destino (interno/externo), URL.
- **Criar subgrupo**: título, ícone (só habilitado dentro de menu nested).
- **Criar menu de topo**: título, ícone, tipo (`leaf` / `flat` / `nested`).

### Icon picker
Componente novo `IconPicker` (`src/components/menus/IconPicker.tsx`) que:
- Lista subconjunto curado de ~120 ícones Lucide relevantes (Home, Package, Factory, BarChart3, etc.) para não travar renderizando 1000+.
- Campo de busca por nome.
- Renderiza a partir do map `icons` de `lucide-react` (dinâmico por nome).
- Guarda o **nome do ícone como string** no JSON (não o componente).

`menuCatalog.ts` passa a exportar o mapa `iconByName` e uma função `resolveIcon(name)` — o resto do app deixa de importar ícones direto para os menus.

## Migração de dados

O layout atual em `localStorage` (`menuLayout:<userId>`) é lido uma vez, convertido para o novo formato v2 e gravado em `menu_layout_user`; depois a chave local é limpa. Assim ninguém perde as personalizações já feitas.

## Escopo técnico (arquivos)

Novos:
- `supabase/migrations/*_menu_layout.sql` — tabelas, grants, RLS, policies.
- `src/components/menus/IconPicker.tsx`
- `src/components/menus/MenuTreeEditor.tsx` (drag-drop + seleção)
- `src/components/menus/NodePropertiesPanel.tsx`
- `src/components/menus/dialogs/{NovoItemDialog,NovoSubgrupoDialog,NovoTopoDialog}.tsx`
- `src/hooks/useMenuLayoutV2.tsx` (substitui o atual)
- `src/services/menuLayoutApi.ts`

Alterados:
- `src/config/menuCatalog.ts` — ids estáveis em todos os nós + `iconByName`/`resolveIcon`.
- `src/components/AppSidebar.tsx` (ou equivalente) — consumir árvore mesclada.
- `src/pages/PersonalizarMenusPage.tsx` — reescrita completa.

Sem mudanças em outras telas do sistema.

## Fora de escopo
- Permissões por item de menu (quem vê o quê) — continua governado pelos perfis de acesso existentes.
- Temas/cores por menu.
- Versionamento/histórico do layout global (só o último estado é mantido).

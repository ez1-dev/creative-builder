## Objetivo
No modo "Editar layout" do `/passagens-aereas`, permitir **remover qualquer bloco da tela** (KPIs, gráficos, tabela) e depois **trazer de volta** se quiser. Não é exclusão definitiva — é "ocultar do dashboard".

## Como vai funcionar

### Modo edição
- Cada bloco ganha um **botão X (ocultar)** na barrinha de controles do canto superior direito (ao lado dos botões de redimensionar).
- Clicar oculta o bloco imediatamente da grid (em estado pendente — só persiste ao Salvar).
- Aparece um botão **"+ Adicionar bloco"** no topo (na barra cinza ao lado de Cancelar/Restaurar/Salvar) com um menu listando todos os blocos atualmente ocultos. Clicar adiciona de volta na grid (vai pro final).

### Persistência
- O estado oculto/visível é **por dashboard** (continua compartilhado, igual ao layout hoje).
- "Restaurar padrão" volta todos os 7 blocos canônicos para o dashboard.
- Link público (`/compartilhado`): respeita o que está visível no dashboard padrão (blocos ocultos não aparecem).

## Onde mexer

### 1. `dashboard_widgets` (sem migration de schema)
- Já existe a coluna `config jsonb`. Vou guardar `{ "hidden": true }` ali quando o bloco estiver oculto.
- Bloco oculto **continua existindo** na tabela (com seu layout salvo) — só não é renderizado.

### 2. `src/hooks/usePassagensLayout.ts`
- Tipo `PassagensWidget` ganha `hidden?: boolean` (lido de `config.hidden`).
- `mergeWithDefaults` preserva `hidden` quando vem do banco.
- `saveLayout(next)` passa a aceitar também flag `hidden` por bloco e grava em `config`.
- Novo método `toggleHidden(type, hidden)` simplifica o botão "ocultar/mostrar".

### 3. `src/components/passagens/PassagensLayoutGrid.tsx`
- No filtro de `orderedWidgets`, ignorar blocos com `hidden === true`.
- Adicionar botão **X** (ícone `EyeOff` do lucide) na barrinha flutuante de cada bloco, ao lado dos botões de tamanho — só aparece em modo edição.
- Callback `onHide(type)` é propagada para o pai.

### 4. `src/components/passagens/PassagensDashboard.tsx`
- Estado pendente passa a incluir `hidden` por bloco (não só layout).
- Acima da grid, na barra de edição, adicionar dropdown **"+ Adicionar bloco"** que lista os blocos ocultos (pelo `title` do `PASSAGENS_DEFAULT_WIDGETS` ou do banco).
- Toast de salvar: "Layout salvo para todos os usuários."
- Toast de restaurar: limpa também o `hidden`.

### 5. `src/lib/visualCatalog.ts`
- Sem mudanças. Permissões visuais (`profile_visuals`) e ocultação por edição são coisas distintas: permissão é por perfil/usuário, ocultação aqui é decisão de layout do dashboard.

## Fora de escopo
- **Excluir definitivamente** o bloco do banco: não recomendo — se o admin clicar errado, perde o layout. Prefiro o modelo "ocultar/mostrar". Se você quiser exclusão definitiva mesmo, me avise e troco para `DELETE FROM dashboard_widgets`.
- Layout por usuário: continua compartilhado (como hoje).
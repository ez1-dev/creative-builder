## Objetivo
Modernizar a tela `/requisicoes` (RequisicoesListPage) mantendo 100% da lógica atual (hooks, filtros, API, navegação). Somente camada visual/UX.

## Mudanças propostas

### 1. KPIs com hierarquia visual
- Substituir os 10 cards uniformes cinza por um grid mais rico:
  - Cada KPI ganha ícone lucide dedicado (ex: `Clock` aguardando aprovação, `CheckCircle2` aprovadas, `PackageSearch` separação, `AlertOctagon` atrasadas, `Zap` emergenciais, `PlugZap` erro integração).
  - Cor semântica por categoria (tokens do design system): `primary` (fluxo normal), `warning` (aguardando/atrasadas), `success` (aprovadas/atendidas), `destructive` (erro/emergencial).
  - Card com borda lateral colorida (accent bar 3px), fundo `bg-card`, hover sutil (`hover:shadow-md transition`).
  - Layout de faixa horizontal: ícone à esquerda em círculo `bg-<cor>/10`, label pequena em cima, número grande embaixo.
- KPIs viram atalhos clicáveis: clicar filtra a tabela pela situação correspondente (chamando `setFiltros`).

### 2. Cabeçalho e ações
- Manter `PageHeader` (título/descrição).
- Botões "Atualizar" e "Nova requisição" ganham estilo consistente: primário sólido para "Nova", `outline` com ícone girando enquanto `list.isFetching`.

### 3. Barra de filtros
- Transformar o box atual em uma toolbar única alinhada:
  - Campo "Número" com ícone `Search` interno, `Enter` aplica.
  - Chip visual mostrando filtro ativo (situação selecionada via KPI) com botão "×" para limpar.
  - Botão "Limpar" só aparece quando há filtro ativo.

### 4. Tabela
- Zebra rows (`even:bg-muted/30`), header `bg-muted/50 uppercase text-xs tracking-wide`.
- Coluna "Requisição": número em `font-mono font-semibold` + tipo como subtítulo pequeno (removendo coluna Tipo separada e ganhando densidade).
- Coluna "% Atend.": mini barra de progresso (`Progress` shadcn) + valor.
- Coluna "Prioridade": badge colorido (emergencial=destructive, alta=warning, normal=secondary, baixa=outline).
- Coluna "Necessária": destaque em vermelho quando vencida (data < hoje e não atendida).
- Datas em formato compacto `dd/MM HH:mm`.
- Skeleton loading mais elegante (linhas com alturas variadas).
- Empty state ilustrado: ícone `Inbox` grande + texto + botão "Nova requisição".

### 5. Consistência de tokens
- Zero cores hardcoded. Substituir `text-amber-900 bg-amber-50 border-amber-200` do banner mock por variantes do design system (`Alert` shadcn com `variant="default"` e classe warning já existente no projeto, ou tokens semânticos).

## Fora de escopo
- Nenhuma alteração em `useRequisicoes`, `useRequisicoesKpis`, `requisicoesApi`, tipos, rotas, ou nas demais páginas do módulo.
- Sem mudança de cálculo, filtros de backend ou contratos.

## Arquivos afetados
- `src/pages/requisicoes/RequisicoesListPage.tsx` (único arquivo alterado).

## Detalhes técnicos
- Usar componentes já disponíveis: `Card`, `Badge`, `Progress`, `Alert`, `Button`, `Input`, `Table`, `Skeleton`.
- Ícones via `lucide-react` (já em uso).
- Mapeamento KPI→filtro situação usará os enums existentes em `@/types/requisicoes` (sem inventar valores novos).

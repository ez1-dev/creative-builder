# Recolher Filtros e Gerador de Gráfico IA — /bi/comercial

Adicionar controles de recolher/expandir para os dois blocos do topo da página `/bi/comercial`, liberando espaço vertical para os dashboards.

## Escopo

Apenas `src/pages/bi/ComercialPage.tsx`. Sem alterar componentes da biblioteca BI.

## Mudanças

### 1. Estado local de visibilidade
Adicionar dois `useState<boolean>`:
- `filtrosOpen` (default: `true`)
- `iaOpen` (default: `false` — fica recolhido por padrão, já que é uso pontual)

Persistir em `localStorage` (`bi-comercial:filtros-open`, `bi-comercial:ia-open`) para lembrar a escolha do usuário entre sessões.

### 2. Cabeçalho recolhível para Filtros
Envolver o bloco atual de filtros em um container com um header clicável:
- Título "Filtros" + chevron (`ChevronDown`/`ChevronUp` do lucide-react)
- Quando recolhido, mostrar um resumo compacto na mesma linha: unidade ativa + período (ex: `GENIUS • 202601–202612`) e um botão pequeno "Aplicar" continua acessível, OU oculta tudo e o usuário precisa expandir para aplicar (definir abaixo).
- Botão "Aplicar" e "Limpar" continuam dentro do bloco expandido.

### 3. Cabeçalho recolhível para Gerador de Gráfico IA
Envolver `<AiChartGenerator />` em um bloco com header clicável:
- Título "Gerar gráfico com IA" + ícone `Sparkles` + chevron
- Quando recolhido: só o header (linha fina), economiza ~300px de altura
- Quando expandido: renderiza o componente normalmente

### 4. Estilo
- Headers usam o mesmo padrão visual dos cards da página (`Card` shadcn + `border` + `hover:bg-accent/30`)
- Respeitam o tema dinâmico já implementado (cor primária via `var(--bi-primary)`)
- Transição suave (`transition-all`)

## Comportamento

- Estado inicial: Filtros expandido, Gerador IA recolhido.
- Clicar no header alterna o estado e persiste em `localStorage`.
- Recolher os dois libera ~400px de altura para os widgets do dashboard.
- Nenhuma mudança em lógica de filtros, drill, edição de dashboard ou IA.

## Critérios de aceite

- Header "Filtros" e "Gerar gráfico com IA" são clicáveis e alternam visibilidade.
- Estado persiste após reload.
- Tema dinâmico por unidade continua funcionando.
- Modo Editar Dashboard, salvar layout, drill e geração IA seguem intactos.
- Nenhuma outra página é afetada.

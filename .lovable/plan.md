## Objetivo

No card **Registros** do componente `PassagensDashboard`, adicionar três controles na barra de cabeçalho:

1. **Campo de busca** (lupa) — filtra a tabela por: colaborador, centro de custo, projeto/obra, origem, destino, motivo, cia aérea, nº bilhete, localizador.
2. **Toggle "Agrupar por Colaborador"** — quando ligado, transforma a tabela em linhas-grupo expansíveis (▶/▼), cada uma com nome do colaborador + qtd + soma R$. Clicar expande para mostrar os registros daquele colaborador.
3. **Menu de ordenação** (`ArrowUpDown`) com 6 opções:
   - Data (mais recente / mais antiga)
   - Colaborador (A→Z / Z→A)
   - Valor (maior / menor)

## Implementação

**Arquivo:** `src/components/passagens/PassagensDashboard.tsx`

### Imports
Adicionar ícones: `ChevronDown`, `ChevronRight`, `Search`, `ArrowUpDown` (no import lucide-react existente).

### Novos estados (junto dos demais)
```ts
const [busca, setBusca] = useState('');
const [agruparColab, setAgruparColab] = useState(false);
const [ordenacao, setOrdenacao] = useState<'data_desc'|'data_asc'|'colab_az'|'colab_za'|'valor_desc'|'valor_asc'>('data_desc');
const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
```

### Nova lista derivada `displayRows`
A partir do `crossFiltered` existente:
- Aplica `busca` (lowercase, includes em todos os campos textuais listados).
- Aplica `ordenacao`.
- Resultado é o que vai pra tabela / exportação.

Exportar CSV passa a usar `displayRows` em vez de `crossFiltered`.

### Agrupamento por colaborador
Quando `agruparColab === true`, usar `useMemo` para gerar `gruposColab: { colaborador, qtd, total, registros[] }[]` a partir de `displayRows`, ordenado conforme `ordenacao` (A→Z / Z→A no nome; valor maior/menor no `total`; demais ordenações ordenam por nome A→Z).

### UI no header do card Registros
Substituir o `CardHeader` atual por um header com:
- Esquerda: título "Registros (N)".
- Direita (responsivo, flex-wrap, gap-2):
  - `<Input>` com `Search` à esquerda — placeholder "Buscar...".
  - `<DropdownMenu>` ou `<Select>` "Ordenar" com as 6 opções.
  - Botão toggle "Agrupar Colaborador" (variant `outline`, `default` quando ativo).
  - Botão "Exportar CSV" existente.

### Renderização da tabela
- **Sem agrupamento**: mantém comportamento atual, só usando `displayRows`.
- **Com agrupamento**: para cada grupo:
  - Linha-grupo (bg-muted/40, font-medium): chevron + colaborador + badge com qtd + total à direita. Clique alterna abertura.
  - Se aberto, renderiza as linhas dos `registros` daquele grupo (mesmas colunas atuais, sem repetir o nome do colaborador — mostrar "—" ou indentar).

## Resultado

Usuário passa a poder, no card Registros:
- Digitar para encontrar qualquer passagem rapidamente.
- Trocar a ordem entre Data/Nome/Valor.
- Ligar "Agrupar Colaborador" e ver subtotais por pessoa, expandindo só quem interessa.

Filtros do topo (Colaborador, CC, Tipo, Mês, Datas) e cross-filters dos gráficos continuam funcionando — busca e ordenação são aplicadas em cima do que já foi filtrado.
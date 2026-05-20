## Visualização automática ao selecionar OP na grid

### Objetivo

Quando o usuário clicar em uma linha da grid de OPs, carregar automaticamente o preview da OP (cabeçalho + componentes + desenhos) numa área **abaixo da grid**, mantendo a grid visível e destacando a linha selecionada.

Tudo o que já existe — chamada `/impressao`, renderização do `OpPrintSheet` em modo `preview`, fetch autenticado de desenhos via `useAuthedBlobUrls`, mensagem "Nenhum desenho encontrado..." apenas em tela, regras de impressão (OP / componentes >7 / cada desenho em A4) — é reaproveitado.

### Mudanças (apenas em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`)

**1. Novo estado de seleção da grid**

- Adicionar `const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null)`.
- Resetar `selectedRowKey` no `limpar()` e sempre que filtros principais mudarem (mesmo `useEffect` que já zera `selectedKeys`).

**2. Novo handler `handleRowSelect(op)`**

Substitui o uso atual de `handleRowVisualizar` no clique da linha. Comportamento:

- Validar origem `100` e situação `C` (igual a `onSelectOp`).
- `setSelectedRowKey(opKey(op))`.
- Chamar `fetchData` direto com payload já calculado a partir da OP e dos filtros atuais:
  - `cod_emp`, `cod_ori`, `num_orp` ← da OP clicada
  - `listar_componentes: 'S'`, `listar_desenho: 'N'`, `incluir_desenhos: 'S'`
  - `cod_etg`/`cod_cre` ← `filtros.cod_etg` / `filtros.cod_cre` quando preenchidos
  - `quebrar_por_operacao` ← `filtros.quebrar_por_operacao`
- **NÃO** chamar `setPreview(true)` — a grid continua visível. O `OpPrintSheet` é renderizado em modo `preview` na nova área (item 4).
- Não alterar `filtros.num_orp`, para que `showGrid` continue verdadeiro e a grid permaneça na tela.

**3. Linhas da grid clicáveis e destacadas**

- `<TableRow>`: adicionar `onClick={() => handleRowSelect(op)}`, `className="cursor-pointer hover:bg-muted/50"`, e `data-state={selectedRowKey === k ? 'selected' : (checked ? 'selected' : undefined)}`.
- Clique no checkbox e nos botões de Ação continua funcionando — encapsular com `e.stopPropagation()` nos handlers existentes (`handleRowVisualizar`, `handleRowImprimir`, `toggleOne`).

**4. Nova área "Visualização da Ordem de Produção" abaixo da grid**

Inserir, **entre o card da grid e o `print-root`**, um bloco `no-print`:

```text
[Card]
  Título: "Visualização da Ordem de Produção"
  Subtítulo: identificação da OP selecionada (Origem / Nº / Produto)
  ── Conteúdo dinâmico ──
    loading              → "Carregando visualização da OP..."
    error                → "Não foi possível carregar a visualização da OP." + botão "Tentar novamente"
    data?.cabecalho      → vazio (o OpPrintSheet já é renderizado em modo preview dentro de print-root, logo abaixo)
    nenhuma OP selecionada → "Selecione uma OP na grid acima para visualizar."
```

A renderização do `OpPrintSheet` continua dentro de `print-root` (atual linha 977). Como já roda em modo `preview` quando `preview === true` OU quando o componente recebe a prop, vamos:

- Forçar `preview` no `OpPrintSheet` sempre que `selectedRowKey` estiver setado, mesmo com `preview` global `false`: `<OpPrintSheet preview={preview || !!selectedRowKey} ... />`.
- Assim, a "Visualização" mostra:
  - Página da OP
  - Página de componentes (regra >7 já implementada no `OpPrintSheet`)
  - Resumo dos desenhos via `renderPreviewDesenhosResumo` (já trata "Nenhum desenho encontrado…")
  - Páginas A4 dos desenhos (`op-drawing-page`) — visíveis em tela logo abaixo da OP; na impressão saem em páginas separadas conforme CSS atual.

**5. Botão "Visualizar" da linha**

Manter, mas redirecionar para o mesmo `handleRowSelect` (sem `setPreview(true)`). Remover/ajustar o `handleRowVisualizar` antigo (que escondia a grid).

**6. Botão "Imprimir todas"** (item 6 só citado para referência)

Não precisa mudar — já respeita os filtros atuais.

### Regras preservadas

- Nunca selecionar/exibir OP com `cod_ori = 100` ou `sit_orp = 'C'`.
- Mensagem "Nenhum desenho encontrado para este produto." continua **fora** da impressão (já implementado em `OpPrintSheet.renderPreviewDesenhosResumo`).
- Cada desenho continua em página A4 própria na impressão (`.op-drawing-page` no `op-print.css`).
- Desenhos nunca renderizados dentro da página da OP; aparecem **abaixo** dela (em tela e impressão).

### Fora de escopo

- Backend / contrato da rota `/impressao` (apenas consumo).
- Layout interno do `OpPrintSheet` e CSS de impressão (já cobrem o requisito).
- Mudanças na impressão em lote (`OpPrintBatch`).



## Paginação no drill "Ver tudo · detalhamento completo"

### Diagnóstico
No `KpiDeepSheet` (`src/pages/AuditoriaApontamentoGeniusPage.tsx`, ~linhas 1929–2000), a tabela de OPs renderiza **todas** as OPs de `opsFiltradas` de uma vez. Quando o recorte tem dezenas/centenas de OPs, fica difícil navegar e o sheet vira um scroll longo.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Estado de paginação interno ao `KpiDeepSheet`**
- Adicionar `const [paginaOps, setPaginaOps] = useState(1);`
- Adicionar `const [tamanhoPaginaOps, setTamanhoPaginaOps] = useState(20);`
- Opções de tamanho: `10 | 20 | 50 | 100`.

**2. Reset de página quando o recorte muda**
- `useEffect(() => { setPaginaOps(1); setOpExpandida(null); }, [kind, somenteInconsist, busca, ordem, tamanhoPaginaOps]);`
- Garante que ao trocar filtro/ordem/KPI/tamanho, voltamos para página 1.

**3. Slice da lista**
- `const totalPaginasOps = Math.max(1, Math.ceil(opsFiltradas.length / tamanhoPaginaOps));`
- `const paginaAtual = Math.min(paginaOps, totalPaginasOps);`
- `const opsPagina = opsFiltradas.slice((paginaAtual - 1) * tamanhoPaginaOps, paginaAtual * tamanhoPaginaOps);`
- Trocar `opsFiltradas.map(...)` pela iteração sobre `opsPagina` no `<tbody>`.
- Manter a linha de "Nenhuma OP para os filtros" usando `opsFiltradas.length === 0`.

**4. Rodapé de paginação abaixo da tabela**
- Reaproveitar o componente já existente `PaginationControl` (`src/components/erp/PaginationControl.tsx`) — mesmo padrão visual usado em outras telas.
- Layout do rodapé:
  - Esquerda: `Select` "Linhas por página" (`10 / 20 / 50 / 100`).
  - Direita: `<PaginationControl pagina={paginaAtual} totalPaginas={totalPaginasOps} totalRegistros={opsFiltradas.length} onPageChange={setPaginaOps} />`
- Só renderizar quando `opsFiltradas.length > tamanhoPaginaOps` (esconder se cabe tudo em 1 página); o select de tamanho aparece quando `opsFiltradas.length > 10`.

**5. Atualizar contador no header do sheet (cosmético)**
- Manter `SheetDescription` como está; opcionalmente adicionar texto auxiliar logo acima da tabela: `"Exibindo X–Y de Z OPs"` com `text-[11px] text-muted-foreground`.

### Detalhes técnicos
- `useState`/`useEffect`/`useMemo` já estão importados no arquivo.
- `PaginationControl` e `Select` já são usados em outras partes (sem novos imports além de `PaginationControl`).
- Não muda a lógica de `agregarPorOp`, filtros, ordenação, drill de linhas (`OpLinhasInline`), nem o toggle "Só c/ inconsistência".
- Continua respeitando o estado atual de `opExpandida`; ao mudar de página, fechamos a expansão (no reset acima) para evitar acordeão "fantasma" fora da página visível.

### Fora de escopo
- Paginação server-side (continua sendo client-side sobre o recorte já carregado).
- Mudar paginação da tabela principal da página.
- Persistir tamanho de página entre sessões.

### Resultado
- A tabela de OPs do drill passa a ser paginada (20 por padrão, configurável 10/20/50/100).
- Controles de página aparecem quando há mais de uma página; navegação rápida via `<< < > >>`.
- Sheet fica enxuto mesmo em recortes com centenas de OPs; busca, ordenação, filtros e expansão por OP continuam funcionando.


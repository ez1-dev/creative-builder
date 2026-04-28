## Agrupar "Registros" por dimensão (com painel expansível)

Adicionar ao card **Registros** do dashboard de Passagens Aéreas um seletor "Agrupar por" que conta grupos distintos do recorte filtrado e abre um painel com a lista detalhada (qtd de registros e valor total por grupo).

### Comportamento

- O card **Registros** ganha:
  - Um pequeno **Select** no topo direito do card com as opções de agrupamento.
  - O **valor principal** continua sendo a quantidade total de registros, mas ganha abaixo um subtítulo dinâmico tipo `8 Centros de Custo` (contador de grupos distintos com base na dimensão escolhida).
  - Um **botão "Ver detalhes"** (ícone de chevron) que abre um `Sheet` lateral com a tabela agrupada.

- **Opções de agrupamento** disponíveis no select:
  - Centro de Custo
  - Projeto / Obra
  - Colaborador
  - Motivo da Viagem
  - Cia Aérea
  - Tipo de Despesa

- **Painel lateral (Sheet)** mostra:
  - Título: `Registros agrupados por <dimensão>`
  - Tabela ordenada por valor desc com colunas: **Grupo**, **Qtd**, **Valor Total**, **% do total**.
  - Linha de "Sem informação" para registros com o campo nulo/vazio (já há padrão `Sem CC` / `Não informado` no código atual).
  - Linha de totais no rodapé.
  - Botão "Exportar CSV" desse agrupamento (reaproveita lógica do `exportPassagensCsv`, gerando CSV com colunas grupo/qtd/valor).

- O agrupamento respeita TODOS os filtros já aplicados:
  - Filtros do topo (Colaborador, CC, Tipo, Mês, Período).
  - Cross-filters dos gráficos (`selectedMes`, `selectedMotivo`, `selectedCC`).
  - Ou seja, opera sobre `crossFiltered`.

### Mudanças técnicas

Arquivo: `src/components/passagens/PassagensDashboard.tsx`

1. Novo estado:
   ```ts
   type GroupBy = 'centro_custo' | 'projeto_obra' | 'colaborador' | 'motivo_viagem' | 'cia_aerea' | 'tipo_despesa';
   const [groupBy, setGroupBy] = useState<GroupBy>('centro_custo');
   const [groupSheetOpen, setGroupSheetOpen] = useState(false);
   ```

2. Memo `grupos` derivado de `crossFiltered`:
   - Itera, normaliza valor nulo (`'Sem informação'`), agrega `qtd` e `valor`.
   - Retorna array ordenado por `valor desc`.
   - `gruposCount = grupos.length`.

3. Substituir o `<KPICard title="Registros">` por um **card customizado** (mantendo o visual do `KPICard`, mas com slot extra para o select e botão). Para evitar refatorar o `KPICard`, envolvo num `<div className="relative">` com:
   - O `KPICard` original (valor = `totalRegistros`, descrição = `${gruposCount} ${labelDimensao}s`).
   - Um `Select` compacto posicionado no canto superior direito (`absolute top-2 right-2`) com as 6 opções.
   - Um botão fantasma "Ver detalhes" (ícone) que seta `groupSheetOpen=true`.

4. Novo componente inline `<Sheet>` (shadcn) com a tabela agrupada + total no footer + botão exportar.

5. Util de label e CSV:
   ```ts
   const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
     { value: 'centro_custo', label: 'Centro de Custo' },
     { value: 'projeto_obra', label: 'Projeto/Obra' },
     { value: 'colaborador', label: 'Colaborador' },
     { value: 'motivo_viagem', label: 'Motivo da Viagem' },
     { value: 'cia_aerea', label: 'Cia Aérea' },
     { value: 'tipo_despesa', label: 'Tipo de Despesa' },
   ];
   ```

6. Tokens semânticos do design system (sem cores hardcoded), ícones `lucide-react` (`Layers`, `ChevronRight`, `Download`).

### Fora do escopo

- Não altera a página pública `PassagensAereasCompartilhadoPage` (se quiser depois, replico).
- Não persiste a escolha de agrupamento entre sessões.
- Não adiciona drill-down clicando numa linha do agrupamento (o clique só fica nos gráficos como hoje).

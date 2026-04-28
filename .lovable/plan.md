## Problema

O KPI **"Colaboradores (catálogo)"** no dashboard de Passagens Aéreas não muda quando o usuário aplica filtros do topo nem quando clica em uma barra/fatia para fazer cross-filter.

**Causa:** o card mostra a variável `catalogoCount`, que é resultado de uma query independente à tabela `colaboradores_catalogo` (cadastro mestre de colaboradores ativos cadastrados no sistema). Ele conta o catálogo inteiro, sem relação alguma com os dados filtrados na tela.

## Solução

Trocar o KPI para refletir os **colaboradores únicos presentes nos dados filtrados** (`crossFiltered`), assim como os outros KPIs (Total, Registros, Ticket Médio).

### Mudanças (`src/components/passagens/PassagensDashboard.tsx`)

1. Remover o `useState` `catalogoCount` e o `useEffect` que faz a query em `colaboradores_catalogo` (não será mais usado).
2. Calcular um novo memo `colaboradoresUnicos`:
   ```ts
   const colaboradoresUnicos = useMemo(
     () => new Set(crossFiltered.map((r) => r.colaborador).filter(Boolean)).size,
     [crossFiltered],
   );
   ```
3. Atualizar o `<KPICard>`:
   - Título: **"Colaboradores"** (remover "(catálogo)" para não confundir).
   - Valor: `colaboradoresUnicos`.
   - Tooltip/descrição opcional: "Colaboradores distintos nos registros filtrados".
4. Limpar o import de `supabase` se ele não for mais usado em outro lugar do arquivo (verificar antes de remover).

### Resultado esperado

- Sem filtros: mostra a quantidade de colaboradores distintos no conjunto de dados carregado.
- Ao filtrar por mês / clicar em uma barra do gráfico de meses, motivo ou centro de custo: o KPI atualiza para refletir quantos colaboradores únicos existem naquele recorte.

### Fora do escopo

- Não muda a página pública compartilhada (`PassagensAereasCompartilhadoPage`); se quiser o mesmo ajuste lá, faço em outra rodada.

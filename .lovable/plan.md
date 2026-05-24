## Objetivo

Adicionar **agrupador hierárquico expansível com subtotal** nas três tabelas do módulo Carga de Produção:

1. `PorRecursoTable` (aba "Por Centro de Recurso" do dashboard)
2. `CentrosRecursoTab` (aba "Centros + Operações")
3. `DetalheOpsTab` (drill de OPs)

Campos de agrupamento (selecionáveis pelo usuário, ordem hierárquica): **Unidade de Negócio · Tipo de Recurso · Centro de Custo · Centro de Recurso**.

## UX

Acima de cada tabela, uma barra de "Agrupar por":
```
Agrupar por: [Unidade ×] [Tipo ×] [+ adicionar]    [Expandir tudo] [Recolher tudo]
```
- Chips removíveis em ordem (a ordem define a hierarquia).
- Dropdown "+ adicionar" mostra só os campos ainda não usados.
- Sem chips ⇒ tabela plana (comportamento atual).

Comportamento das linhas:
- Cada nível vira uma **linha-pai** colspan no início mostrando: `▶ {campo}: {valor} · {n} itens`.
- Subtotal somando colunas numéricas (`qtd_ops`, `qtd_operacoes`, `qtd_prevista`, `carga_prevista_min`, `carga_prevista_horas` — no detalhe: `quantidade_prevista`, `tempo_previsto_min`, `tempo_previsto_horas`) renderizado nas colunas correspondentes da linha-pai.
- Indentação progressiva por nível (padding-left = `level * 16px`).
- Click no chevron expande/recolhe. Estado mantido em `Set<string>` (chave = path do grupo `un|tipo|ccu`).
- Linha "Total geral" continua no rodapé.

## Implementação

### Componente reutilizável `useTableGrouping`
`src/components/producao/carga-dashboard/useTableGrouping.ts`
```ts
export type GroupField = 'unidade_negocio' | 'tipo_recurso' | 'codccu' | 'codcre';
export interface GroupNode<T> {
  key: string;            // path completo: "MAQ|MONTAGEM|01"
  field: GroupField;
  value: string;
  level: number;
  count: number;          // nº de linhas-folha
  totals: Record<string, number>;
  children: GroupNode<T>[]; // vazio no último nível
  rows: T[];                // só preenchido no último nível
}
export function useTableGrouping<T>(rows: T[], groupFields: GroupField[], numericKeys: (keyof T)[]): GroupNode<T>[]
```
Constrói a árvore agregando recursivamente. Aceita lista vazia ⇒ retorna `[{rows: all}]` sintético (que a UI ignora).

### Componente `GroupByBar`
`src/components/producao/carga-dashboard/GroupByBar.tsx`
- Recebe `fields`, `value: GroupField[]`, `onChange`.
- Renderiza chips + dropdown + botões expand/collapse all.
- Labels pt-BR: Unidade, Tipo, CCusto, Recurso.

### Renderização nas tabelas

Para cada tabela, refatorar o `<TableBody>` para iterar pela árvore: helper `renderGroup(node, expanded, onToggle, columns)` retorna linhas. A `PorRecursoTable` já tem `total` no rodapé — manter.

**Compatibilidade de campos:**
- `PorRecursoTable` e `CentrosRecursoTab`: campos batem com `GroupField`.
- `DetalheOpsTab`: campos batem (a linha tem todos), mas as métricas somadas são `quantidade_prevista`, `tempo_previsto_min`, `tempo_previsto_horas`. Em níveis intermediários a contagem mostra "X OPs distintas / Y linhas" — para simplicidade na 1ª iteração, mostro só `count` de linhas (não dedup por OP). O usuário pediu agrupador, não dedup; se quiser, faço depois.

### Estado do agrupador
- Default em cada tabela: **sem grupo** (não muda comportamento atual ao abrir).
- O estado é local de cada tabela (não global) — usuário pode agrupar diferente em cada aba.

## Arquivos

**Novos**
- `src/components/producao/carga-dashboard/useTableGrouping.ts`
- `src/components/producao/carga-dashboard/GroupByBar.tsx`
- `src/components/producao/carga-dashboard/GroupedTableBody.tsx` (helper de render)

**Editados**
- `src/components/producao/carga-dashboard/PorRecursoTable.tsx` — adicionar barra + render agrupado.
- `src/components/producao/carga/CentrosRecursoTab.tsx` — idem (mantém busca/sort existentes; sort aplicado dentro de cada folha).
- `src/components/producao/carga/DetalheOpsTab.tsx` — idem (paginação continua; agrupador opera sobre a página corrente; deixo um aviso "agrupando 50 linhas da página atual").

## Fora de escopo

- Drag-and-drop para reordenar grupos (chips removíveis e re-adicionados já cobrem 90% do uso).
- Persistir preferência do usuário em localStorage.
- Exportar CSV com agrupamento (export atual, se houver, continua plano).
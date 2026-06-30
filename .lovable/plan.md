## Objetivo
Ajustar `src/pages/BomPage.tsx` (e tipos em `src/lib/api.ts`) para suportar o novo parâmetro `somente_materias_primas`, exibir todos os campos novos vindos da API e refletir custos das matérias-primas, sem nenhum cálculo no front.

## Mudanças

### 1. `src/lib/api.ts`
- Estender o tipo `BomResponse` / item de `dados` com os campos novos: `codigo_modelo_pai`, `descricao_modelo_pai`, `quantidade_acumulada`, `quantidade_acumulada_com_perda`, `familia_componente`, `origem_componente`, `tipo_linha_estrutura`, `eh_materia_prima`, `preco_medio`, `preco_nf_ultima_compra`, `preco_ultima_entrada_cadastro`, `custo_calculado`, `custo_unitario_referencia`, `custo_total_referencia`, `criterio_custo_referencia`, `numero_nf_ultima_compra`, `serie_nf_ultima_compra`, `data_entrada_nf_ultima_compra`, `fornecedor_ultima_compra`, `caminho`.
- Sem alterar autenticação nem o cliente `api`.

### 2. `src/pages/BomPage.tsx`

**Filtros**
- Adicionar `somente_materias_primas: boolean` no `useState` de filtros (default `false`).
- Renderizar um `<Checkbox>` "Somente matérias-primas" no `FilterPanel`.
- Em `search()`, incluir `somente_materias_primas: filters.somente_materias_primas || undefined` na chamada `api.get('/api/bom', ...)`.
- No `ExportButton`, repassar o mesmo parâmetro nos `params` de `/api/export/bom`.

**Colunas da tabela** (substituir conjunto atual mantendo árvore colapsável existente):
- Nível
- Código modelo pai / Descrição modelo pai
- Código componente / Descrição componente (mantém indent + chevron já existente)
- Derivação, Unidade
- Família, Origem
- Tipo linha (badge; se `MATERIA_PRIMA` → badge `secondary` "Matéria-prima")
- Matéria-prima? (Sim/Não a partir de `eh_materia_prima`)
- Qtd. utilizada, Qtd. acumulada, Qtd. acum. c/ perda (4–6 casas via `formatNumber(v, 6)`)
- Preço médio, Preço NF última compra, Preço última entrada, Custo calculado, Custo unit. ref., **Custo total ref.** (todos via `formatCurrency`)
- Critério custo ref.
- NF última compra (número/série), Data entrada NF, Fornecedor última compra
- Caminho

Helper local `displayOrDash(v)` → `'-'` quando null/undefined/''; aplicar em todas as colunas.

**Destaque de linha matéria-prima**
- Atualizar `getBomRowClassName` para, quando `row.tipo_linha_estrutura === 'MATERIA_PRIMA'` (ou `row.eh_materia_prima === true`), aplicar classe sutil (`bg-amber-50` ou similar do design system) sobrescrevendo a cor por nível.

**Resumo acima da tabela**
- Substituir/expandir os `KPICard`s atuais para mostrar:
  - Código do conjunto (`data.cabecalho.codigo_modelo`)
  - Total de linhas (`data.dados.length`)
  - Total de matérias-primas (`data.dados.filter(d => d.eh_materia_prima).length`) — contagem simples no front, sem cálculo de custo
  - Custo total referência → somatório direto de `custo_total_referencia` das linhas retornadas, formatado em BRL
- Manter KPIs existentes (Modelo, Níveis, Modelos Filhos) reposicionados.

**Contexto IA (`useAiPageContext`)**
- Adicionar `somente_materias_primas` aos filters e o custo total ao bloco de kpis.

### 3. Botão opcional "Exportar 3 códigos Jeferson"
- Adicionar um botão extra no `PageHeader.actions` ao lado do `ExportButton`, que reaproveita a lógica autenticada de download do `ExportButton` chamando `/api/export/bom-lote` com `codmods=245000115,240000760,245000103&somente_materias_primas=true&max_nivel=15`, nome de arquivo `estrutura_multinivel_jeferson.xlsx`.
- **Pré-condição:** verificar primeiro se `ExportButton` aceita endpoint/filename customizados; se sim, usar diretamente. Se não, replicar internamente o mesmo padrão de download autenticado já existente (sem criar nova camada de auth).
- Se em runtime a API responder 404/405, manter o botão mas exibir toast de erro padrão (não há como detectar existência em build-time; o usuário pediu para não criar caso o endpoint não exista — interpretar como "criar agora, já que será disponibilizado").

## Fora de escopo
- Nenhum cálculo de custo, agregação de quantidades, ou regra de matéria-prima no front.
- Sem mudanças em autenticação, no `api` client ou em `ExportButton` além do necessário para passar o novo parâmetro / endpoint.
- Sem alterações de backend (apenas consumo dos novos campos).

## Validação
- Consultar `codmod=245000115`, `max_nivel=15`, `situacao=TODOS`, `somente_materias_primas=true` e conferir:
  - Tabela renderiza todos os campos novos com formatação BRL / 4-6 casas / `-` em vazios.
  - Linhas `MATERIA_PRIMA` aparecem destacadas + badge.
  - KPIs mostram código conjunto, total linhas, total MPs, custo total referência (soma simples do campo).
  - Export Excel reflete o mesmo filtro.

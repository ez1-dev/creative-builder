## Escopo

Aging já está alinhado ao spec (cards de vencido, faixas coloridas, export Excel via blob). Este plano cobre:

1. **Kardex** — novos campos do payload (conta contábil do produto, giro/estoque médio/transferências, tipo `transferencia`).
2. **Conciliação Estoque × Contábil** — nova tela.
3. Integração com drill contábil (link produto → Kardex).

---

## 1. Kardex — enriquecer payload

**`src/lib/contabil/kardexApi.ts`**
- `KardexProduto`: adicionar `conta_contabil?: { ctared: number; clacta: string; descricao: string }`.
- `KardexResumo`: adicionar `giro?`, `estoque_medio?`, `transferencias_qtd?`, `transferencias_valor?`.
- `KardexTipo`: passar a `'entrada' | 'saida' | 'transferencia'`.

**`src/pages/contabilidade/KardexPage.tsx`**
- Cabeçalho da ficha: mostrar `conta_contabil.clacta — descricao` (badge ao lado do código do produto).
- Cards: adicionar KPI **Giro** (`resumo.giro`, 2 casas, com tooltip "saídas ÷ estoque médio ((inicial+final)/2)") e opcional "Estoque médio".
- Se `transferencias_qtd`/`_valor` > 0, mostrar chip "Transferências: qtd / valor" no bloco de resumo.
- Tabela de movimentos: nova cor **azul claro** para linhas `tipo === 'transferencia'` (manter verde=entrada, vermelho=saída).
- Legenda das cores atualizada.

## 2. Conciliação Estoque × Contábil (nova tela)

**`src/lib/contabil/conciliacaoEstoqueApi.ts`** (novo)
- Tipos: `ConciliacaoEstoqueConta`, `ConciliacaoEstoqueResponse` conforme payload do spec.
- `fetchConciliacaoEstoque(params)` → `GET /api/contabil/estoque/conciliacao`.
- `downloadConciliacaoEstoqueExcel(params)` → mesmo padrão fetch+blob usado em Aging/Kardex.

**`src/pages/contabilidade/ConciliacaoEstoquePage.tsx`** (novo)
- Filtros: `data_fim` (obrigatório, default = hoje), `clacta` (input livre, ex. "1125"), `tolerancia` (número, default 1), toggle **"Somente divergências"**, `codemp/codfil`.
- Selo no topo: verde "CONCILIADO" ou âmbar "DIVERGE (N contas)" a partir de `resumo.conciliado` / `resumo.contas_divergentes`.
- Cards: Saldo Estoque · Saldo Contábil · **Diferença** (colorida por sinal) · Contas analisadas/divergentes.
- Tabela: Classificação (`clacta`) · Descrição · Saldo Estoque · Saldo Contábil · **Diferença** · Situação (OK/Divergente). Linhas `ok:false` em vermelho, ordem já vem do backend (|diferença| desc).
- Ação por linha: **"Ver Kardex"** — navega para `/contabilidade/kardex` com a conta filtrada (parâmetro na URL apenas informativo; a busca é por produto).
- Botão **Exportar Excel** no header.

## 3. Registro (rotas, menu, permissões)

- `src/App.tsx`: registrar rota `/contabilidade/conciliacao-estoque` → `ConciliacaoEstoquePage`.
- `src/config/menuCatalog.ts`: adicionar item **"Conciliação Estoque × Contábil"** no submenu Financeiro e Contábil, após Kardex.
- `src/pages/ConfiguracoesPage.tsx` e `src/lib/screenCatalog.ts`: adicionar código `CONT_CONCILIACAO_ESTOQUE` na Central de Liberações / catálogo de telas.

## 4. Detalhes técnicos

- Reaproveitar `contabilApi` + `buildContabilRequest` (header Authorization + `ngrok-skip-browser-warning`).
- Downloads Excel sempre via `fetch` + blob (padrão já em uso).
- Timeouts: 30s para lista, mantendo padrão dos demais módulos contábeis.
- Sem alterações no Aging (já em conformidade).

## Fora de escopo

- Link direto "Conciliação → Kardex do produto" com pré-seleção de produto (backend não devolve produtos por conta neste endpoint). Deixamos apenas navegação para a página Kardex.

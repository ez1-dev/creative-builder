
## Objetivo

Reformular os filtros da tela `/producao/impressao-op` para suportar busca por **Pedido** e por **Relatório de Produção** (alternativos entre si), eliminar qualquer uso da **origem 100** (que não deve aparecer), e exibir uma **grid de OPs** quando o filtro retornar várias ordens.

## Mudanças

### 1. Tipos (`src/lib/producao/opcoesImpressao.ts`)

- Adicionar:
  - `OpcaoPedido { num_ped, label? }`
  - `OpcaoRelatorioProducao { rel_prd, label? }`
- Estender `OpcaoOp` com: `num_ped?`, `rel_prd?`, `quantidade?`, `unidade?`, `situacao?`, `data_geracao?`, `inicio_previsto?`.
- Estender `OpcoesImpressao` com: `pedidos?`, `relatorios_producao?`.
- Estender `OpcoesImpressaoParams` com: `num_ped?`, `rel_prd?`.

### 2. Hook `src/hooks/useOpcoesImpressaoOp.ts`

- Adicionar estados `pedidos`, `relatoriosProducao`.
- Em `reloadBase()`: chamar `/opcoes?cod_emp=1` (default fixo) e popular tudo, **filtrando** origens com `cod_ori == "100"` antes de armazenar (helper `dropOri100`).
- Novos métodos:
  - `reloadByPedido(cod_emp, num_ped)` → atualiza `origens`, `ops`.
  - `reloadByRelatorio(cod_emp, rel_prd)` → atualiza `origens`, `ops`.
  - `reloadOpContexto(cod_emp, cod_ori, num_orp)` → atualiza `estagios`, `centrosRecurso`.
- `searchOps(q, { cod_emp, num_ped?, rel_prd? })` — assinatura nova aceitando objeto de contexto; envia `num_ped` ou `rel_prd` quando presentes. Remover `cod_ori` do contexto de busca.
- Toda função aplica `dropOri100` em `origens` e em `ordens_producao` (descarta OPs com `cod_ori == "100"`).

### 3. Hook `src/hooks/useImpressaoOrdemProducao.ts`

- Sem alteração de comportamento. Só garantir que nunca envia `cod_ori=100` (a validação fica no componente; o hook só repassa).

### 4. Filtros da página (`src/lib/producao/opImpressao.ts`)

Estender `ImpressaoOpFiltros` com:
- `num_ped?: string`
- `rel_prd?: string`

(São usados só no estado da tela, não vão no payload `/impressao`.)

### 5. Página `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

**Estado inicial**: `cod_emp = '1'` (em vez de vazio). Ao montar: `reloadBase()` que já chama com `cod_emp=1`.

**Layout do formulário** (mantendo o grid responsivo e os tokens do design system existente):

Linha 1: Empresa | Pedido | Relatório de Produção | Origem
Linha 2: Ordem de Produção (autocomplete, ocupa 2 colunas) | Estágio | Centro de Recurso
Linha 3: Listar Componentes | Listar Desenho

**Comportamentos**:

- **Empresa** (`SelectBuscavel`): ao mudar, limpa Pedido/Relatório/Origem/OP/Estágio/CR e chama `reloadBase` com a nova empresa (ajustar `reloadBase` para aceitar `cod_emp` opcional, default `'1'`).
- **Pedido** (`SelectBuscavel` a partir de `opcoes.pedidos`): ao selecionar, limpar `rel_prd`, `cod_ori`, `num_orp`, `cod_etg`, `cod_cre`; chamar `reloadByPedido`.
- **Relatório de Produção** (`SelectBuscavel`): ao selecionar, limpar `num_ped`, `cod_ori`, `num_orp`, `cod_etg`, `cod_cre`; chamar `reloadByRelatorio`.
- **Origem** (`SelectBuscavel`): opções de `opcoes.origens` (já sem 100). Apenas filtra a grid local; **não dispara nova chamada**.
- **Ordem de Produção** (`OpAutocomplete`): fetcher passa `{ cod_emp, num_ped, rel_prd }` para `searchOps`. Ao selecionar OP:
  - preencher `cod_emp`, `cod_ori`, `num_orp`, `num_ped`, `rel_prd` a partir da OP;
  - chamar `reloadOpContexto` para popular estágios/CRs.
- **Estágio**: ao mudar, chamar `reloadCres` (já existente) — mantém comportamento atual.

**Grid de OPs** (novo): renderizada quando `(num_ped || rel_prd)` está selecionado **e** nenhuma OP individual foi escolhida (`!num_orp`). Usa `Table` do shadcn com colunas:

- Origem | OP | Pedido | Relatório Produção | Produto | Descrição | Quantidade | Unidade | Situação | Data Geração | Início Previsto | Ações

Linhas vêm de `opcoes.ops` (já filtrado sem origem 100). Quando filtrado por Origem, aplica `.filter(op => op.cod_ori === filtros.cod_ori)` no client.

Ação por linha: botão **Visualizar** (ícone `Eye`) que faz `onSelectOp(op)` e então `consultar()`, e botão **Imprimir** que faz o mesmo + `window.print()` após o fetch resolver.

**Botão Consultar**: validar que há `cod_emp`, `cod_ori`, `num_orp`. Se faltar OP mas houver pedido/relatório com várias OPs, exibir toast "Selecione uma OP da lista".

**Botão Limpar**: reseta tudo, mantém `cod_emp='1'`, e chama `reloadBase('1')`.

### 6. Componente `OpAutocomplete`

Trocar a prop `fetcher: (q: string) => Promise<OpcaoOp[]>` mantida; o contexto (`num_ped`/`rel_prd`) é capturado via `useCallback` no parent (igual ao padrão atual com `cod_ori`). A função `formatOp` passa a montar:

`Origem / OP - Pedido - Rel.Prod - Produto - Descrição`

usando `op.label` quando existir; senão monta a partir de `op.cod_ori`, `op.num_orp`, `op.num_ped`, `op.rel_prd`, `op.produto`, `op.descricao_produto`.

### 7. Garantias anti-origem-100

- Helper único `dropOri100<T extends { cod_ori?: string }>(arr) = arr.filter(x => String(x.cod_ori ?? '') !== '100')` em `useOpcoesImpressaoOp.ts`.
- Aplicado a `origens` e a `ordens_producao` em **todas** as respostas.
- `searchOps` também aplica.
- Nenhum lugar do código envia `cod_ori=100` como default. A página inicializa `cod_ori: ''`.

### 8. Documentação

Atualizar `docs/backend-impressao-ordem-producao.md` com nota: "tela suporta filtros `num_ped` e `rel_prd` em `/opcoes`; origem 100 não deve aparecer nas listas".

## Estados/UX

- Loading da grid: "Carregando ordens de produção..."
- Vazio: "Nenhuma ordem de produção encontrada para os filtros selecionados."
- Erro: mensagem da API (já tratado pelo hook).

## Fora de escopo

- Backend FastAPI (assume-se que `/opcoes` já aceita `num_ped`, `rel_prd` e que retorna `pedidos`, `relatorios_producao`).
- `OpPrintSheet`, layout de impressão, CSS de impressão.
- Outras telas de produção.

## Validação

1. Abrir `/producao/impressao-op` → request única `GET /opcoes?cod_emp=1`. Selects Empresa, Pedido, Relatório, Origem populados; **origem 100 ausente**.
2. Selecionar Pedido X → `GET /opcoes?cod_emp=1&num_ped=X`; grid mostra OPs do pedido; Relatório some/limpa.
3. Selecionar Relatório Y → `GET /opcoes?cod_emp=1&rel_prd=Y`; grid mostra OPs; Pedido limpa.
4. Digitar no autocomplete de OP com pedido selecionado → request inclui `num_ped` e `q`.
5. Selecionar OP → estágios/CRs carregam; Consultar funciona; Visualizar Impressão funciona.
6. Botão Imprimir na grid → faz consulta + abre print.
7. Limpar → mantém Empresa=1 e recarrega base.
8. Nenhum request enviado contém `cod_ori=100`; nenhum select mostra origem 100.

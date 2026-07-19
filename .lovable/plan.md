## Parte 1 — Detalhe da OP

**Arquivo:** `src/services/requisicoesApi.ts` (função `normalizeOpConsulta`)

Reescrever a normalização para ler **estritamente** de `raw.op.*` quando `raw.op` for objeto (com fallback para o topo só quando `raw.op` não existir, para compatibilidade com mock):

- `produto_final ← op.produto_final`
- `descricao ← op.descricao`
- `situacao ← op.sitorp`
- `situacao_desc ← op.situacao_desc`
- `quantidade_prevista ← op.qtd_prevista`
- `quantidade_produzida ← op.qtd_produzida`
- `saldo ← op.saldo` (fallback: prev − prod)
- `centro_custo ← op.centro_custo`
- `codfam ← op.codfam`, `numped ← op.numped`
- `projeto_obra ← op.projeto_obra` (permitir `null` → UI mostra "—")
- `derivacao / codder ← op.derivacao` (permitir `null` → UI mostra "—")
- `pode_requisitar ← op.pode_requisitar === true` (default `false` só quando estritamente `false`; se ausente e a OP veio, tratar como `true` sim/não? — **manter `=== true` estrito**, como o backend garante o campo)
- `motivo_bloqueio ← op.motivo_bloqueio` (string ou `null`)
- `componentes ← raw.componentes` (fica no topo)
- `total_componentes ← raw.total_componentes`

Corrigir também o helper `pick`: hoje descarta `false` como "vazio" ao usar `v !== ''` só em combinação — validar; e evitar leitura duplicada com spread `{...raw, ...raw.op}` que hoje faz o topo poluir os campos aninhados.

**Arquivos:** `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` e `src/pages/requisicoes/PortalRequisicoesPage.tsx`

- Trocar `Field label="Derivação" value={op.data.derivacao ?? op.data.codder}` por `value={op.data.derivacao}` (permitir `null` → "—" via componente `Field`).
- Trocar `Projeto/Obra` para ler somente `op.data.projeto_obra`.
- Banner de bloqueio só quando `op.data.pode_requisitar === false`; texto do aviso = `op.data.motivo_bloqueio` (sem sufixo "no momento" quando existir motivo do backend).
- Badge "Situação" usa `situacao_desc` (fallback para `situacao`).

## Parte 2 — Lookups via `/api/requisicoes/lookup/*`

**Arquivo:** `src/services/requisicoesApi.ts`

Reescrever as três funções para usar os endpoints do módulo requisições (não `/api/cadastros/*`), com shape `{ total, itens: [...] }`:

1. `buscarCentrosCusto({ q })` → `GET /api/requisicoes/lookup/centros-custo?q=&limit=50`  
   Item: `{ codigo, descricao, abreviacao }` → mapear para `{ codccu: codigo, desccu: descricao, abreviacao }` (adicionar `abreviacao` ao tipo `CentroCustoLookup`).

2. `buscarProjetos({ q })` → `GET /api/requisicoes/lookup/projetos?q=&limit=50`  
   Item: `{ numero, nome, abreviacao, situacao_desc }` → mapear para `{ numprj: numero, desprj: nome, abreviacao, situacao_desc }` (estender `ProjetoLookup`).

3. **Novo** `buscarComponentes({ q })` → `GET /api/requisicoes/lookup/componentes?q=&limit=50`  
   Item: `{ codigo, descricao, um }` → tipo novo `ComponenteLookup { codigo, descricao, um }`. Exportar em `requisicoesApi`.

Manter debounce 300ms e minChars=2 (já são padrões do `RemoteCombobox`). Manter tratamento `EndpointIndisponivelError` em 404.

**Arquivo:** `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx`

- Substituir o `RemoteCombobox<ProdutoLookup>` do produto pelo novo `RemoteCombobox<ComponenteLookup>` usando `requisicoesApi.buscarComponentes`.
- Ao selecionar componente: setar `codcmp = codigo`, `descricao = descricao`, `unidade = um` (readonly, sem input manual de UM).
- Ajustar exibição para `codigo — descricao` e helper mostrando `UM: um`.
- Atualizar `RemoteCombobox` de Centro de Custo / Projeto para exibir novos labels (`codigo — descricao`, `numero — nome`) e usar `abreviacao/situacao_desc` como linha secundária.

## Verificação

- `tsgo` para checar tipos.
- Testar visualmente `/requisicoes/nova-op` com uma OP liberada (campos preenchidos, sem banner) e uma bloqueada (banner com `motivo_bloqueio`).
- Testar `/requisicoes/nova` autocomplete de componente / CC / projeto.

## Razão Contábil — nova coluna "Centro de Custo"

Adicionar coluna **Centro de Custo** à grid do Razão (drills DRE e Balanço) consumindo `item.centro_custo` do endpoint `GET /api/contabil/drill-lancamentos`, sem inferência no frontend.

Superfície única: `src/components/dre-studio/DrillDrawer.tsx` (o arquivo `src/components/contabil/DrillDrawer.tsx` só re-exporta). Tipagem em `src/lib/contabil/drillLancamentosApi.ts`.

### 1. Tipagem (`drillLancamentosApi.ts`)

Adicionar interface `DrillLancamentoCentroCusto` e estender `DrillLancamentoItem`:

```ts
export interface DrillLancamentoCentroCusto {
  codccu?: string | null;
  descricao?: string | null;
  fonte?: 'RATEIO_PROPRIA_CONTA' | 'RATEIO_CONTRAPARTIDA' | 'DOCUMENTO_ORIGEM' | string | null;
  multiplos?: Array<{ codccu?: string | null; descricao?: string | null }> | null;
}
```

Em `DrillLancamentoItem`, substituir o `centro_custo` atual pela nova interface (o campo `ccu` já existe como fallback legado). Nada muda em `fetchDrillLancamentos` nem no hook.

### 2. Leitura defensiva no drawer

Helper único usado por grid, tooltip, filtro, modal e exportação:

```ts
const cc = item.centro_custo ?? (item.ccu ? { codccu: item.ccu, descricao: null, fonte: null, multiplos: null } : null);
const codigo = cc?.codccu ?? null;
const descricao = cc?.descricao ?? null;
const multiplos = cc?.multiplos ?? [];
const temMultiplos = multiplos.length > 1;
const label = temMultiplos
  ? `Vários (${multiplos.length})`
  : ([codigo, descricao].filter(Boolean).join(' - ') || '—');
```

Labels de fonte:

```ts
const FONTE_CC_LABEL = {
  RATEIO_PROPRIA_CONTA: 'Rateio da própria conta',
  RATEIO_CONTRAPARTIDA: 'Rateio da contrapartida',
  DOCUMENTO_ORIGEM: 'Documento de origem',
};
```

### 3. Grid do Razão

- Nova coluna **Centro de Custo** posicionada logo após **Conta Contábil** e antes de **Usuário Origem**.
- Célula: `label` calculado acima; `—` quando ausente.
- Tooltip da célula:
  - único CC: `"12790 - G-Custos Gerais Manufatura\nFonte: <label>"` (linha de fonte omitida quando `fonte` for `null`).
  - múltiplos: lista `codccu - descricao` (um por linha) + `Fonte: <label>` quando presente.
- **Nenhuma nova linha** é gerada por CC; renderização continua 1:1 com `response.itens`.
- Nenhum recálculo de saldo/débito/crédito.

### 4. Filtro por Centro de Custo

Estender o campo de busca existente da grid para casar (case-insensitive) contra:

- `cc.codccu`
- `cc.descricao`
- todos os `multiplos[].codccu` e `multiplos[].descricao`

Sem filtro dedicado novo; entra na mesma caixa de busca livre já presente, para não poluir a barra de filtros.

### 5. Modal de detalhe — seção "Centro de Custo"

Nova seção entre a seção Contábil e a Rastreabilidade da origem:

- **Único CC** (`multiplos.length <= 1`):
  - Código: `codccu`
  - Descrição: `descricao`
  - Fonte: `FONTE_CC_LABEL[fonte] ?? fonte ?? '—'`
- **Vários CCs**:
  - Lista `• codccu - descricao` para cada item de `multiplos`
  - Fonte: mesma linha única abaixo da lista
- Sem CC: seção mostra `—` no lugar de código/descrição; não esconder a seção para preservar layout.

### 6. Exportação (Excel/CSV/PDF)

Adicionar duas colunas ao final da exportação existente:

- **Centro de Custo**
  - único: `"12790 - G-Custos Gerais Manufatura"`
  - vários: `"12790 - G-Custos Gerais Manufatura; 12810 - Produção"` (join `; ` com todos os `multiplos` efetivos, nunca `Vários (N)`)
  - vazio: célula em branco
- **Fonte do Centro de Custo**: `FONTE_CC_LABEL[fonte]` ou vazio.

### 7. Compat e não-regressões

- `centro_custo` ausente → cai no fallback `ccu`; ausência total → `—`.
- Nenhum fallback cross-item (linha anterior, primeiro CC do lançamento, CC da conta/cliente/fornecedor).
- Nenhuma consulta ao ERP, nenhum join, nenhum parsing adicional no frontend.
- Saldos, débitos, créditos, truncamento, seleção de conta, badges de usuário e documento continuam intactos.

### Arquivos alterados

- `src/lib/contabil/drillLancamentosApi.ts` — nova interface `DrillLancamentoCentroCusto` e tipagem de `centro_custo` no item.
- `src/components/dre-studio/DrillDrawer.tsx` — nova coluna na grid, tooltip com fonte, extensão do filtro de busca, seção "Centro de Custo" no modal, colunas na exportação.

### Critérios de aceite (após restart da API porta 8070)

- Grid mostra `Centro de Custo` entre Conta Contábil e Usuário Origem.
- EST/CPR/VEN com CC único exibem `codccu - descricao`.
- PAT com CC vindo do documento exibe o CC e tooltip mostra `Fonte: Documento de origem`.
- PAG/TES sem CC exibem `—`.
- Lançamento com múltiplos CCs mostra `Vários (N)` e tooltip lista todos.
- Nenhuma linha do Razão é duplicada; contagem = `response.itens.length`.
- Filtro localiza por código e por descrição, inclusive dentro de `multiplos`.
- Modal exibe seção Centro de Custo com Código/Descrição/Fonte (ou lista + fonte para vários).
- Exportação contém `Centro de Custo` e `Fonte do Centro de Custo`, com múltiplos expandidos por `;`.
- Nenhum CC é inventado no frontend; ausência é sempre `—`.

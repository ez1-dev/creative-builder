## Objetivo

Habilitar o filtro "Data de Pagamento" (já presente visualmente na tela de Contas a Pagar) para que ele realmente filtre títulos pelo campo `data_ultimo_movimento` no backend, usando os parâmetros `data_movimento_ini` / `data_movimento_fim` que o backend já reconhece.

## Diagnóstico do que já existe

Na inspeção do `src/pages/ContasPagarPage.tsx`:

- O estado inicial **já contém** `data_pagamento_ini` e `data_pagamento_fim`.
- A UI **já tem** os dois inputs com labels "Pagamento de" e "Pagamento até" (linhas 373–382).
- Porém, esses valores são enviados ao backend como `data_pagamento_ini` / `data_pagamento_fim` (via `params: any = { ...filters }`), nomes que o backend **não reconhece** — o backend espera `data_movimento_ini` / `data_movimento_fim`.
- A coluna na grid hoje aparece como **"Últ. Mov."** (linha 58).
- A exportação Excel envia `exportParams = { ...filters }`, então herda o mesmo bug de naming.

Conclusão: não é preciso adicionar inputs novos nem novo estado. Basta **renomear os parâmetros enviados ao backend** e **ajustar labels**.

## Mudanças (somente em `src/pages/ContasPagarPage.tsx`)

### 1. Mapear parâmetros antes de chamar a API (função `search`)

Dentro do bloco que monta `params` (após o `...filters`), mapear:

```ts
if (params.data_pagamento_ini) {
  params.data_movimento_ini = params.data_pagamento_ini;
}
if (params.data_pagamento_fim) {
  params.data_movimento_fim = params.data_pagamento_fim;
}
delete params.data_pagamento_ini;
delete params.data_pagamento_fim;
```

Colocar antes do loop final que limpa chaves vazias.

### 2. Mapear os mesmos parâmetros na exportação Excel

Trocar:
```ts
const exportParams = { ...filters };
```
por uma versão que aplica o mesmo mapeamento `data_pagamento_*` → `data_movimento_*` (e remove os antigos), garantindo que o endpoint `/api/export/contas-pagar` (e o de árvore) receba os parâmetros corretos. Os filtros de `status_titulo`, `data_emissao_*`, `data_vencimento_*` continuam fluindo normalmente.

### 3. Ajustar labels da UI para "Data Pagamento"

- Trocar `Label` "Pagamento de" → **"Data Pagamento Inicial"** e adicionar `id="dataPagamentoIniContasPag"` no `Input`.
- Trocar `Label` "Pagamento até" → **"Data Pagamento Final"** e adicionar `id="dataPagamentoFimContasPag"` no `Input`.

### 4. Ajustar texto da coluna na tabela

Linha 58: trocar header `'Últ. Mov.'` → **`'Data Pagamento'`** na definição da coluna `data_ultimo_movimento` (em `columnsDetalhada`). Verificar se há mesma coluna em `columnsAgrupada` e aplicar o mesmo ajuste se existir.

### 5. `clearFilters` — sem mudanças

Já usa `setFilters({ ...initialFilters })`, que zera `data_pagamento_ini` e `data_pagamento_fim`. Nada a fazer.

## Critérios de aceite cobertos

1. Status = Pago → continua trazendo títulos pagos (sem alteração).
2. Informar Data Pagamento Inicial/Final → backend recebe `data_movimento_ini` / `data_movimento_fim` e filtra por `data_ultimo_movimento`.
3. Exportação Excel respeita o mesmo período (mapeamento aplicado em `exportParams`).
4. Filtros de Emissão e Vencimento continuam intactos.
5. Nenhum filtro existente é removido.

## Fora de escopo

- Backend FastAPI não é alterado — ele já suporta `data_movimento_ini` / `data_movimento_fim` conforme descrito pelo usuário.
- Nenhuma mudança em Cloud / Supabase.
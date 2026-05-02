
## Problema

No Painel de Compras (`/painel-compras`), na aba **Dashboard** e nos cards do **Detalhamento**, os valores estão somando "por página" em alguns cenários — o usuário quer ver os totais de **todas as páginas** do filtro corrente.

## Diagnóstico

A página já tenta usar `data.resumo` (KPIs) e `data.graficos` (top fornecedores, situações, tipos, famílias, etc.) que o backend devolve agregados sobre todo o resultado do filtro. Existem dois pontos onde os totais voltam a ser calculados sobre a **página corrente** (100 linhas) e geram o sintoma:

1. **Fallback do `useMemo` de `kpis` e `chartData`** (linhas 207-326 de `src/pages/PainelComprasPage.tsx`): quando `data.resumo`/`data.graficos` não vem, somamos sobre `data.dados`, que é só a página atual.
2. **Mitigação de `tipo_item=SERVICO`** (linhas 121-155): sobrescreve `data.dados` com o filtrado e recalcula `resumo.itens_produto`/`itens_servico` apenas na página corrente. O próprio toast já avisava que ficaria impreciso.
3. `tamanho_pagina` está fixo em 100 (linha 101), sem opção do usuário aumentar.

## Solução

Adicionar um seletor de **tamanho da página** com opções 100 / 250 / 500 / 1000 / **Todos** e ajustar a lógica para que, quando "Todos" for escolhido (ou paginação ficar agregada), os cards e gráficos somem sobre o conjunto completo.

### 1. Seletor de tamanho de página

- Novo estado `tamanhoPagina` (default `100`).
- Novo `Select` no painel de filtros (ou ao lado da paginação) com opções: `100`, `250`, `500`, `1000`, `Todos`.
- "Todos" envia `tamanho_pagina=100000` (limite alto seguro) — ao backend, sinalizando que queremos o resultado completo. Mostrar `toast.info` quando "Todos" for escolhido alertando que pode demorar mais.
- Trocar a opção dispara `search(1)`.

### 2. Garantir KPIs/gráficos sempre agregados

- Manter a preferência por `data.resumo` e `data.graficos` (já vêm agregados do backend).
- Quando o tamanho selecionado for **menor que `total_registros`** e usarmos o fallback client-side, exibir um aviso discreto nos KPIs ("Totais da página atual — selecione 'Todos' para o agregado completo") em vez de simplesmente mostrar valores parciais sem contexto.
- **Remover a sobrescrita de `data.resumo.itens_produto`/`itens_servico`** dentro da mitigação `tipo_item`: deixar `resumo` intacto (vem agregado do backend) e aplicar o filtro client-side só em `dados` da tabela. Isso resolve o caso onde "Tipo Item = SERVIÇO" estava fazendo os cards refletirem só a página.

### 3. Detalhamento (tabela)

- A tabela continua paginada normalmente respeitando `tamanhoPagina` selecionado.
- Quando "Todos" for selecionado, esconder o `PaginationControl` (já que tudo está em uma página) e mostrar contagem total no header da tabela.

### 4. Exportação

- A exportação CSV já manda os mesmos filtros e ignora paginação no backend, então não muda nada — só revalidar.

## Arquivos a alterar

- `src/pages/PainelComprasPage.tsx`
  - Adicionar estado `tamanhoPagina` e o `Select` de tamanho.
  - Trocar `tamanho_pagina: 100` (linha 101) por `tamanho_pagina: tamanhoPagina === 'todos' ? 100000 : tamanhoPagina`.
  - Remover recálculo de `resumo.itens_produto`/`itens_servico` na mitigação de tipo_item (linhas 134-142). Manter apenas o filtro de `dados` para a tabela.
  - Esconder `PaginationControl` quando "Todos".
  - Toast informativo ao escolher "Todos".

## Detalhes técnicos

```text
PainelComprasPage
├── filters (sem alterar)
├── tamanhoPagina: 100 | 250 | 500 | 1000 | 'todos'   ← NOVO
├── search(page)
│     └─ params.tamanho_pagina = tamanhoPagina === 'todos' ? 100000 : Number(tamanhoPagina)
├── KPIs / charts: priorizar data.resumo e data.graficos (já agregados pelo backend)
└── Tabela paginada respeita tamanhoPagina; se "Todos", esconde PaginationControl
```

Sem mudanças no backend — o backend já agrega `resumo` e `graficos` sobre o filtro completo.

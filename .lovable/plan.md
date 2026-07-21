## Objetivo

Ajustar o Drill de Razão (DRE e Balanço) para destacar divergências de usuário e corrigir os rótulos das origens dos módulos.

Escopo: apenas `src/components/dre-studio/DrillDrawer.tsx` (usado tanto por DRE quanto por Balanço via `src/components/contabil/DrillDrawer.tsx`). Nada de backend.

## Alterações

### 1. Destaque quando `usuario_origem_difere === true`

Na renderização das linhas de `itens[]` (loop `itens.map`):

- Ler `r.usuario_origem_difere` (novo campo do backend) — tratar como boolean.
- Quando `true`:
  - Aplicar classe de destaque na `<TableRow>` (fundo `bg-amber-100/60` + borda-esquerda âmbar), preservando o hover e o zebra.
  - Envolver as células "Usuário Origem" e "Usuário Lcto." em um `<Tooltip>` com o texto:
    `"Lote aberto por {usuario_origem}, lançado por {usuario_lancamento}"`.
  - Ao lado do "Usuário Lcto.", exibir um badge pequeno "≠" (ou `AlertTriangle` do lucide) com aria-label descritivo.

Também no modal de detalhe (`<Dialog>` "Lançamento {numero}"), quando `detalhe.usuario_origem_difere` for `true`, mostrar aviso âmbar acima do grid:
"Divergência de usuário — lote aberto por X, lançado por Y."

### 2. Rótulos oficiais das origens (módulos)

Adicionar mapa local no topo do arquivo:

```ts
const ORIGEM_LABELS: Record<string, string> = {
  EST: 'Estoque',
  PAT: 'Patrimônio/Ativo Fixo',
  CPR: 'Contas a Pagar',
  PAG: 'Pagamentos',
  VRB: 'Verbas',
  TES: 'Tesouraria',
  VEN: 'Faturamento/Vendas',
  REC: 'Contas a Receber',
  IOD: 'Integração',
  IMP: 'Importação',
  MAN: 'Manual (contabilidade)',
};
```

Uso:
- Na coluna "Origem Lcto." da tabela: exibir `ORIGEM_LABELS[r.origem_codigo] ?? r.origem_descricao ?? ''`. O rótulo do front sobrescreve o `origem_descricao` do backend (evita "Manutenção" errado).
- Na exportação Excel: mesma substituição.
- No modal de detalhe: `{origem_codigo} - {label}`.

### 3. Tipagem

Adicionar `usuario_origem_difere?: boolean` na interface `RazaoItem` (linha 101) e no `DrillLancamentoItem` de `src/lib/contabil/drillLancamentosApi.ts`.

### 4. Tipos de tabela HTML (colspan)

Nada muda — o número de colunas continua o mesmo. Só as células e a `<TableRow>` recebem classes/tooltips.

## Fora de escopo

- Backend (`E640LOT`, `E640LCT`) — o consumidor apenas confia nos campos entregues.
- Coluna nova de divergência: usuário pediu apenas destaque nas duas colunas existentes.
- Balanço e DRE compartilham o mesmo componente; ambos recebem a mudança automaticamente.

## Como testar

1. Abrir Razão em uma conta com muitos lançamentos (ex.: Bancos c/ Movimento).
2. Localizar (via API) uma linha com `usuario_origem_difere: true` — deve aparecer com fundo âmbar e tooltip nas colunas de usuário.
3. Conferir se código `MAN` mostra "Manual (contabilidade)" e não "Manutenção".
4. Exportar Excel — coluna "Origem" deve refletir o rótulo corrigido.

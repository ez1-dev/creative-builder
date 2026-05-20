## Objetivo
Ajustar a grid de OPs encontradas em `/producao/impressao-op` para usar os campos individuais retornados pela API (fallbacks oficiais), sem depender de `op.label`.

## Mudanças

### 1. Tipos (`src/lib/producao/opcoesImpressao.ts`)
Estender `OpcaoOp` com os campos alternativos retornados pelo backend:
- `cod_pro?: string`
- `des_pro?: string`
- `qtde?: number | string`
- `qtd_prevista?: number | string`
- `un?: string`
- `unidade_medida?: string`
- `descricao?: string`

(Mantém os já existentes: `produto`, `descricao_produto`, `quantidade`, `unidade`, `situacao`, `sit_orp`, `situacao_descricao`, `num_ped`, `rel_prd`, `data_geracao`, `inicio_previsto`.)

### 2. Página (`src/pages/producao/ImpressaoOrdemProducaoPage.tsx`)
Na renderização da grid (`<TableBody>`), substituir cada célula pelos mapeamentos:

| Coluna             | Expressão                                                        |
|--------------------|------------------------------------------------------------------|
| Origem             | `op.cod_ori ?? ''`                                               |
| OP                 | `op.num_orp ?? ''`                                               |
| Pedido             | `op.num_ped ?? ''`                                               |
| Relatório Produção | `op.rel_prd ?? ''`                                               |
| Produto            | `op.produto ?? op.cod_pro ?? ''`                                 |
| Descrição          | `op.descricao_produto ?? op.descricao ?? op.des_pro ?? ''`       |
| Qtde               | `op.quantidade ?? op.qtde ?? op.qtd_prevista ?? ''`              |
| Un.                | `op.unidade ?? op.un ?? op.unidade_medida ?? ''`                 |
| Situação           | `op.situacao_descricao ?? op.situacao ?? ''`                     |
| Data Geração       | `op.data_geracao ?? ''`                                          |
| Início Previsto    | `op.inicio_previsto ?? ''`                                       |
| Ações              | botões Visualizar / Imprimir (inalterados)                       |

Filtro de segurança em `opsFiltradas` (já existe parcialmente): excluir `String(op.sit_orp ?? op.situacao ?? '').toUpperCase() === 'C'`.

Helper local `pick(...vals)` para evitar verbosidade nas células:
```ts
const pick = (...vals: any[]) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
  return '';
};
```

### 3. Fora de escopo
- Backend, hook `useOpcoesImpressaoOp`, autocomplete, impressão em lote, demais telas.

### 4. Regras invioláveis mantidas
- Nunca usar `op.label` para popular células da grid.
- Nunca exibir OP cancelada (`sit_orp` ou `situacao` = `'C'`).
- Nunca exibir/enviar `cod_ori = 100`.
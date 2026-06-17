## Objetivo
Enriquecer o "Montador da DRE Gerencial" para mostrar, ao lado de cada conta/máscara do ERP: **nome da conta**, **nível** (profundidade da máscara) e **centros de custo** onde a conta tem lançamentos. As linhas da DRE à esquerda também passam a exibir o **nível** explicitamente.

## Mudanças no contrato do backend (`/dre-dinamica/plano-contas`)
Cada item passa a retornar 3 campos novos. Backend já tem `bi_vm_lanc_contabil.centro_custo` e o ERP tem a descrição da conta — só precisa expor.

```json
{
  "cd_mascara": "3.01.01",
  "cd_conta_contabil": "3010101001",
  "ds_conta": "RECEITA DE VENDAS NO MERCADO INTERNO",
  "nivel": 3,
  "centros_custo": [
    { "cd_centro_custo": "1001", "ds_centro_custo": "ADMINISTRATIVO", "qtd": 12, "valor": -1500.00 },
    { "cd_centro_custo": "2002", "ds_centro_custo": "COMERCIAL", "qtd": 5, "valor": -800.00 }
  ],
  "qtd_lancamentos": 124,
  "valor_total": -53210.55,
  "ja_vinculada": true,
  "linhas_vinculadas": ["RECEITA_BRUTA"]
}
```

Regras:
- `ds_conta`: descrição vinda do plano de contas do ERP (Senior). Pode vir vazia — front mostra "—".
- `nivel`: número de segmentos de `cd_mascara` separados por `.` (ex.: `3.01.01` → 3). Calcular no backend.
- `centros_custo`: agregado por `centro_custo` de `bi_vm_lanc_contabil` no período, ordenado por `valor DESC`, top 10. Vazio quando não houver.
- Atualizar `docs/backend-bi-contabilidade-dre-dinamica-montador.md` com o novo schema.

## Mudanças na tela (`DreMontadorPage.tsx`)

### Coluna esquerda (Linhas da DRE)
- Nova coluna `Nível` antes de `Descrição`, mostrando `l.nivel` como badge pequeno.
- Mantém a indentação visual atual.

### Coluna direita (Contas do ERP)
Novo layout de tabela:

| ☑ | Máscara | Nível | Conta | Nome da conta | Centros de custo | Qtd. | Valor | Status |

- **Nome da conta**: `ds_conta` truncado com tooltip mostrando o nome completo.
- **Nível**: badge `outline` com o número.
- **Centros de custo**: mostra até 2 chips `cd - ds` inline; se houver mais, chip extra `+N` com tooltip listando todos (`cd - ds: BRL valor`). Vazio → "—".
- Ordenação: adicionar `nivel` como chave de ordenação opcional. Manter ordenação por `mascara`, `conta`, `qtd`, `valor`.

### Tipos no front
- `src/lib/bi/dreMontadorApi.ts`: estender `PlanoContaErp` com `ds_conta?: string`, `nivel?: number`, `centros_custo?: { cd_centro_custo: string; ds_centro_custo?: string; qtd: number; valor: number; }[]`. Mapper trata `null`/`undefined` com defaults (`''`, `mascara.split('.').length`, `[]`).

### Comportamento
- Sem alteração em filtros, vinculação ou payload — apenas exibição.
- Logs mantidos.

## Fora de escopo
- Filtros por nível ou por centro de custo (pode ser próximo passo).
- Edição/cadastro de descrição de conta.
- Mudanças no payload de `vincular-contas`.

## Arquivos afetados
- `src/lib/bi/dreMontadorApi.ts` — estender tipo e mapper.
- `src/pages/bi/contabilidade/DreMontadorPage.tsx` — colunas novas + render de chips com tooltip.
- `docs/backend-bi-contabilidade-dre-dinamica-montador.md` — atualizar contrato.

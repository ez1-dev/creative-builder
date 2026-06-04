## Problema

O filtro **Fonte Ação** lista nomes errados (`faturamento`, `faturamento_manual`, `fat_contabil`, `fat_trb`), que não batem com os valores reais gravados em `bi_faturamento.fonte_acao` pelo ETL.

Pelos endpoints e SQL do ETL (`docs/etl-sql/SQL_VM_*.sql` + `docs/backend-bi-faturamento-validacao.md`), os valores corretos são:

- `VM_FATURAMENTO`
- `VM_FATURAMENTO_MANUAL`
- `VM_FAT_CONTABIL`
- `VM_FAT_TRB`
- `SEM_FONTE` (rótulo do frontend para `NULL`)

## Mudanças (apenas frontend)

Arquivo: `src/pages/bi/FaturamentoValidacaoPage.tsx`

1. **Linha 40** — corrigir `FONTE_ACAO_OPTIONS`:
   ```ts
   const FONTE_ACAO_OPTIONS = [
     'VM_FATURAMENTO',
     'VM_FATURAMENTO_MANUAL',
     'VM_FAT_CONTABIL',
     'VM_FAT_TRB',
     'SEM_FONTE',
   ];
   ```

2. **Linha 64** — atualizar o default do `draft.fonte_acao` para usar os novos nomes (manter o mesmo conjunto inicial: comercial + manual):
   ```ts
   fonte_acao: 'VM_FATURAMENTO,VM_FATURAMENTO_MANUAL',
   ```

Nada muda na renderização das tabelas (continuam exibindo `r.fonte_acao ?? 'SEM_FONTE'`) nem no backend — os valores enviados via querystring já passam direto para o filtro `fonte_acao IN (...)`.
## Objetivo
Tornar o botão "Executar" clicável para `VM_FATURAMENTO_MANUAL`, `VM_FAT_CONTABIL` e `VM_FAT_TRB`.

## Causa
Em `src/pages/EtlTarefaDetalhePage.tsx` (linha 111) o botão usa `disabled={!r.ativa}`. As 3 ações estão com `ativa = false` na tabela `etl_acoes`.

## Mudanças

1. **Banco (`etl_acoes`)** — ativar as 3 ações:
   ```sql
   UPDATE public.etl_acoes
   SET ativa = true
   WHERE id_acao IN ('VM_FATURAMENTO_MANUAL','VM_FAT_CONTABIL','VM_FAT_TRB');
   ```

2. **Frontend (`src/pages/EtlTarefaDetalhePage.tsx` linha 111)** — remover `disabled={!r.ativa}` do botão Executar, mantendo o badge "Sim/Não" apenas como indicador visual. Assim qualquer ação, mesmo inativa, pode ser disparada manualmente para teste.

## Fora de escopo
- Lógica de execução em lote (continua respeitando `ativa`).
- Layout/colunas da tabela.
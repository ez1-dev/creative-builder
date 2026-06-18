## Problema

Na tela **Impressão de OP** (`OpPrintSheet.tsx`), o campo **Tmp Unit** mostra `1 min` quando o roteiro tem `0,67 min`, ou `0 min` em operações de laser com tempos baixos. O backend já foi corrigido (`tempo_para_minutos` / `formatar_minutos` / `calcular_tempos_operacao_em_minutos`) e devolve o valor decimal correto em `tmp_unit_min` / `tmp_total_min`, mas o frontend hoje renderiza o `tmp_unit_formatado` cru do backend (que usa `.normalize()` e pode encolher zeros, ex.: `5 min` em vez de `5,00 min`) e, no fallback, joga o número direto sem máscara.

## Mudança

Alterar apenas o frontend, sem tocar em lógica de negócio:

- Criar helper local em `src/lib/producao/opImpressao.ts`:
  - `formatarMinutosBR(valor: number | string | null | undefined): string`
  - Converte o número para `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` e concatena `" min"`.
  - Retorna `"—"` quando o valor for nulo / `NaN`.
- Em `src/components/producao/OpPrintSheet.tsx` (linhas 303–311), trocar a expressão atual por:
  - **Tmp Unit:** `formatarMinutosBR(op.tmp_unit_min ?? op.tmp_unit)` — sempre 2 casas, vírgula como separador.
  - **Tmp Total:** `formatarMinutosBR(op.tmp_total_min ?? op.tmp_total)` — idem.
- O campo `tmp_unit_formatado` do backend deixa de ser consumido na exibição (continua no tipo, mas não é mais usado), eliminando a discrepância de arredondamento.

## Escopo / Não-escopo

- Mudança puramente de apresentação.
- Não altera tipos públicos, contratos com backend, nem outros locais (`DetalheOpsTab`, dashboards de carga continuam usando seu próprio `fmt`).
- Não mexe no PDF em lote (gerado 100% no backend).

## Validação

- Abrir `/producao/impressao-op` para uma OP com tempo `0,67` min → conferir `0,67 min` em Tmp Unit e o total = `0,67 × qtd` com 2 casas.
- Conferir OP com tempo inteiro (`5`) → mostra `5,00 min`.
- Conferir OP sem tempo → mostra `—`.

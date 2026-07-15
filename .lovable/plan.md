## Verificação do frontend x novos comportamentos do backend

Auditei o `DrillDrawer.tsx` e o tipo `DrillLancamentoItem` contra os 3 ajustes que você fez no `dreconfiguravel.py`.

### Resultado

| Ajuste backend | Onde aparece no front | Status |
|---|---|---|
| 1. `usuario_origem` (vem do E640LOT) | Coluna "Usuário origem" da tabela do razão (linha 416) + campo no dialog de detalhe (linha 511) | ✅ Já renderiza — sem mudança necessária |
| 2. `saldo_anterior` corrente por linha | Coluna "Saldo Anterior" da tabela do razão (linha 419) | ✅ Já renderiza — sem mudança necessária |
| 3. `codccu`/`desccu` puxados da contrapartida em contas de Balanço | Campo "Centro de custo" do dialog de detalhe (linhas 506-508) | ⚠️ Renderiza `codccu`/`desccu` corretamente, mas **não trata o caso `"Vários (N)"` + array `multiplos`** |

### Único ajuste proposto — muito pequeno

No dialog "Lançamento {numero}" do `DrillDrawer.tsx`, quando o backend devolver `codccu === "Vários (N)"` (ou vier acompanhado do array `multiplos`), listar cada CC da contrapartida em vez de mostrar só o rótulo agregado.

Alterações:

1. `src/lib/contabil/drillLancamentosApi.ts` — acrescentar campo opcional `multiplos?: Array<{ codccu: string; desccu?: string | null }> | null` na interface `DrillLancamentoItem`.
2. `src/components/dre-studio/DrillDrawer.tsx` — no bloco do dialog (linhas 505-508), se `detalhe.multiplos?.length > 1`, renderizar uma pequena lista `codccu — desccu` (uma por linha) abaixo do rótulo "Vários (N)"; caso contrário, manter comportamento atual.

Nada mais muda: nenhuma queryKey, nenhum recálculo, nenhuma linha de DRE, nenhum outro componente. Backend continua sendo a única fonte de verdade dos valores.

### Fora de escopo

- Backend Python (`dreconfiguravel.py`), testes do backend, restart da 8070.
- Estrutura da DRE, cálculos, fórmulas, chaves de cache, filtros.
- Coluna de CC na grade principal do razão (hoje só existe no dialog — manter assim).

### Confirmação pedida

Quer que eu implemente esse único ajuste do `multiplos`, ou deixamos exatamente como está (o campo já mostra `"Vários (N)"` como texto puro, sem detalhar quais CCs)?

## Ajuste no modal de detalhe do Razão (DrillDrawer)

No modal "Lançamento {NUMLCT}", a seção **Histórico** hoje mostra apenas o texto bruto (`detalhe.historico`) sem limite de altura e sem rolagem. Quando o histórico é longo o modal cresce muito. Além disso, o usuário quer que a **transação usada** apareça junto com o histórico (fica mais fácil de correlacionar com o razão do ERP).

### Mudanças

Arquivo: `src/components/dre-studio/DrillDrawer.tsx` (bloco `col-span-2` das linhas ~1332–1335).

1. **Rolagem vertical no Histórico**
   - Envolver o texto do histórico em um container com altura máxima (`max-h-32`, ~128px) e `overflow-y-auto`.
   - Adicionar `whitespace-pre-wrap break-words` para preservar quebras e evitar overflow horizontal.
   - Aplicar borda/padding leves (`rounded-md border bg-muted/30 p-2 text-sm`) para deixar claro que é uma área rolável.
   - Se `detalhe.historico` estiver vazio/nulo, exibir "—" em vez de área vazia.

2. **Incluir a transação usada**
   - Reaproveitar o helper existente `transacaoOrigemLabel(detalhe)` (já usado na linha 1208 do bloco "Documento/Movimento").
   - Dentro do mesmo `col-span-2` do Histórico, acima do texto, mostrar uma linha "Transação: {código} — {descrição}" (ou só o que estiver disponível). Quando não houver transação, ocultar a linha.
   - Manter a linha "Transação" já existente na seção Documento/Movimento (não duplica visualmente porque essa aparece apenas quando há `Documento/Movimento`; a nova linha no bloco Histórico garante que a transação sempre apareça associada ao lançamento, inclusive quando a seção Documento/Movimento não é renderizada).

### Fora do escopo

- Nenhuma mudança no contrato do endpoint `GET /api/contabil/drill-lancamentos` — os campos `historico`, `transacao_origem`, `transacao_origem_codigo`, `transacao_origem_descricao` já vêm no payload.
- Nenhuma alteração na grid, no export Excel ou nos demais campos do modal.

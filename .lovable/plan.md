## Objetivo

No bloco de cada operação da impressão da OP, o campo **Próx. Oper.** hoje mostra apenas o código (ex.: `2108`). O usuário quer ver **código + nome** (ex.: `2108 TORNEAR (CNC)`), igual ao campo "Operação".

## Abordagem

Resolver no frontend, sem mudar o backend. O valor de `proxima_operacao` corresponde ao `cod_opr` de outra operação já presente em `data.operacoes`. Basta cruzar.

## Mudanças

**`src/components/producao/OpPrintSheet.tsx`**

1. Antes do `operacoes.map(...)`, construir um índice:
   ```ts
   const opPorCodigo = new Map(
     operacoes
       .filter(o => o.cod_opr)
       .map(o => [String(o.cod_opr), o.descricao_operacao ?? ''])
   );
   ```
2. Substituir a célula atual:
   ```tsx
   <div className="v">{op.proxima_operacao ?? '—'}</div>
   ```
   por uma versão que concatena descrição quando encontrada:
   ```tsx
   <div className="v">
     {op.proxima_operacao
       ? [op.proxima_operacao, opPorCodigo.get(String(op.proxima_operacao))]
           .filter(Boolean).join(' ')
       : '—'}
   </div>
   ```

Se `proxima_operacao` não bater com nenhum `cod_opr` (última operação ou rota incomum), mantém apenas o código — sem quebrar.

## Fora do escopo

- Alterações no backend / contrato `/api/producao/ordem-producao/impressao`.
- Mudanças no CSS de impressão.
- Outros campos do bloco de operação.

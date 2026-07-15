## Problema

O modal do lançamento está exibindo `[object Object]` em **Conta Débito** e **Conta Crédito** porque o backend passou a devolver esses campos como objeto estruturado (`{ ctared, clacta, descta, ... }` ou similar) — a tipagem atual em `DrillLancamentoItem` declara `string`, e o `Info` renderiza direto com `String(value)`.

## Solução

Tornar o front tolerante a **qualquer formato** que o backend enviar para `conta_debito` / `conta_credito` (string simples, número, ou objeto com campos como `ctared` / `codigo` / `clacta` / `descta` / `descricao` / `nome`), formatando sempre como texto legível `"<código> - <descrição>"`.

### Mudanças

1. **`src/lib/contabil/drillLancamentosApi.ts`**
   - Ampliar o tipo `DrillLancamentoItem` para aceitar objeto ou string:
     ```ts
     conta_debito?: string | number | { ctared?: number|string; codigo?: string|number; clacta?: string; descta?: string; descricao?: string; nome?: string } | null;
     conta_credito?: /* mesma união */;
     ```

2. **`src/components/dre-studio/DrillDrawer.tsx`**
   - Criar helper local `formatConta(v)` que:
     - retorna `""` se nulo/vazio;
     - se string/number, retorna o valor como está;
     - se objeto, monta `"<codigo> - <descricao>"` a partir de `ctared||codigo||clacta` e `descta||descricao||nome` (ignorando partes vazias).
   - Substituir `value={detalhe.conta_debito}` → `value={formatConta(detalhe.conta_debito)}` (idem para crédito).

3. **Robustez extra (mesmo helper)**
   - Aplicar defensivamente em `conta_descricao`, `desccu`, `origem_descricao`, `usuario_origem`, `usuario_lancamento`, `documento` — se o backend eventualmente enviar objeto num deles, evitamos novo `[object Object]`. Um utilitário genérico `toDisplay(v)` no topo do arquivo cobre esse caso (retorna string para primitivos, aplica `formatConta` para objetos com forma de conta, e `JSON`-safe fallback caso contrário — nunca `[object Object]`).

### Fora de escopo
- Nenhuma alteração de layout, lógica de drill, ou chamadas de API.
- O "Lado (D/C)" continua vindo do campo `debcre` do backend; se estiver ausente permanece `—` (comportamento correto até o backend preencher).
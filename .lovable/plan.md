## Checkbox "Incluir títulos pagos" em Contas a Pagar

### Comportamento
- Por padrão (desmarcado): mantém o comportamento atual — backend retorna apenas títulos não-pagos.
- Marcado: títulos com status PAGO entram no resultado junto com os demais.
- Quando o usuário escolhe um Status específico (ex.: VENCIDO, A_VENCER), o checkbox é ignorado/desabilitado — o filtro de Status tem precedência.

### Arquivo editado
`src/pages/ContasPagarPage.tsx`

1. **`initialFilters`**: adicionar `incluir_pagos: false`.
2. **Função `search`**: lógica para envio ao backend:
   - Se Status específico selecionado → não envia `incluir_pagos` nem `excluir_pagos`.
   - Se Status vazio + checkbox marcado → envia `incluir_pagos=true`.
   - Se Status vazio + checkbox desmarcado → envia `excluir_pagos=true` (mantém comportamento atual de ocultar pagos).
3. **`FilterPanel`**: novo `<Checkbox id="incluir_pagos">` após "Somente cheques", com label "Incluir títulos pagos". Fica `disabled` quando há `status_titulo` selecionado.
4. **`clearFilters`**: já é resetado por `{ ...initialFilters }` — sem alteração extra.

### Contrato backend
`GET /api/contas-pagar`, `/api/contas-pagar-arvore` e `/api/export/contas-pagar` devem aceitar:
- `incluir_pagos=true` → inclui status PAGO no retorno.
- `excluir_pagos=true` → exclui status PAGO (comportamento padrão atual).
- Convive com `status_titulo` (quando informado, este tem precedência).

### Fora do escopo
- Não altera KPIs nem colunas existentes.
- Não cria filtro separado "Somente pagos" (já existe via Status = Pago).

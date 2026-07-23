# Contas a Pagar / Receber — ajustes frontend

Alinhar o frontend ao backend atualizado (pacote A+B+E): default sem títulos pagos, filtro "Parcial" liberado em Receber, export da árvore de Receber, e rótulos corrigidos do filtro de movimento.

## Mudanças

### 1. `src/pages/ContasPagarPage.tsx`
- Default `incluir_pagos: false` já existe — manter.
- Remover a lógica que envia `excluir_pagos=true` quando o checkbox está desmarcado: agora basta não enviar `incluir_pagos` (ou enviar `false`). O backend cuida do default.
- Exceção automática: se `filters.status_titulo` for `PAGO` ou `LIQUIDADO`, forçar `incluir_pagos=true` no request (o backend já ignora, mas mantém coerência) e desabilitar visualmente o checkbox com tooltip "Ignorado quando o status é Pago/Liquidado".
- Renomear rótulos:
  - Coluna da tabela `data_ultimo_movimento`: header `"Data Pagamento"` → `"Data do último movimento"`.
  - Filtros `"Data Pagamento Inicial/Final"` → `"Data do último movimento (início/fim)"`.
  - IDs e mapeamento `data_pagamento_* → data_movimento_*` permanecem.

### 2. `src/pages/ContasReceberPage.tsx`
- Adicionar campo `incluir_pagos: false` no estado inicial de filtros.
- Adicionar **Checkbox "Incluir títulos pagos/liquidados"** na mesma faixa dos outros checkboxes (modo árvore/agrupar), desmarcado por padrão.
- Enviar `incluir_pagos=true` apenas quando marcado; nada caso contrário. Se status = `PAGO`/`LIQUIDADO`, forçar `true` e desabilitar o checkbox (mesma UX do Pagar).
- Habilitar a opção **"Parcial"** no `Select` de status (hoje pode estar oculta/desabilitada por causa do 500 anterior) — permitir seleção normalmente.
- Adicionar filtros "Data do último movimento (início/fim)" espelhando o Pagar, mapeando `data_pagamento_*` → `data_movimento_*` no request (lista + árvore + export).
- **Export árvore Receber**: quando `modoArvoreAtivo`, apontar `ExportButton` para `/api/export/contas-receber-arvore`; caso contrário mantém `/api/export/contas-receber`. Label muda para "Exportar Excel (Árvore)".

### 3. `src/components/erp/ExportButton.tsx`
- Adicionar tratamento 404/501 específico para `/api/export/contas-receber-arvore` (mesma UX que já existe para o export de árvore de pagar).

## Detalhes técnicos

- Nenhuma mudança em `src/lib/api.ts` — parâmetros continuam serializados via query string.
- Nenhuma mudança de schema/tipo em `LinhaArvoreFinanceira`; layout XLSX é responsabilidade do backend.
- Dashboards (`/api/contas-*-dashboard`) NÃO são alterados.
- Reload duro só é necessário se o backend acabou de subir (aviso do prompt); frontend não requer restart.

## Fora do escopo

- Ajustes C (filtro de valor sobre saldo aberto × valor_original) e D (performance do export full-base) mencionados no prompt.

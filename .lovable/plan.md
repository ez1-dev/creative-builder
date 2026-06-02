## Ajuste — Painel de Compras: `somente_pendentes=false` quando Situação = Liquidado

### Problema
Quando o usuário filtra Situação da OC = Liquidado (`situacao_oc=4`), o backend precisa receber explicitamente `somente_pendentes=false`. Hoje:

- Na **consulta** (`buildParams`), `somente_pendentes` é enviado conforme o checkbox da tela, não é forçado a `false` quando há Liquidado selecionado.
- Na **exportação Excel**, `exportParams` herda os filtros, mas o `ExportButton` descarta valores booleanos `false` (só envia booleans quando `true`), então `somente_pendentes=false` nunca chega à URL.

Resultado: a URL exportada fica sem `somente_pendentes=false` mesmo com Liquidado marcado, divergindo do contrato.

### Mudanças (apenas `src/pages/PainelComprasPage.tsx`)

1. **`buildParams` (search) — linhas ~157-180**
   Após montar `situacao_oc`, detectar se `"4"` está na seleção. Se sim, forçar `params.somente_pendentes = false` e enviar como string `"false"` (para sobrepor o filtro do checkbox e garantir que vá na query).

2. **`exportParams` memo — linhas ~637-656**
   Mesma lógica: se `situacao_oc` inclui `"4"`, setar `p.somente_pendentes = 'false'` (string) para que o `ExportButton` não descarte. Caso contrário, manter o comportamento atual (boolean — `true` vai, `false` é omitido).

3. **Confirmar que `exportParams` envia todos os filtros listados pelo usuário**
   Revisar o spread `{ ...filters }` + limpezas para garantir que estes vão quando preenchidos: `tipo_despesa`, `situacao_oc`, `data_emissao_ini`, `data_emissao_fim`, `numero_projeto`, `centro_custo`, `fornecedor`, `transacao`, `familia`, `origem_material`, `codigo_item`, `descricao_item`, `numero_oc`, `tipo_item`, `tipo_oc`. Ajustar nomes/limpezas apenas se algum estiver sendo removido indevidamente.

### Fora de escopo
- Backend, UI dos filtros, lógica do checkbox `somente_pendentes` manual, KPIs/charts.

### Validação
- Selecionar Tipo Despesa = Matéria-prima, Situação = Liquidado, datas 2025-01-01/2025-12-31 → conferir no DevTools (Network) que tanto `/api/painel-compras` quanto `/api/export/painel-compras` recebem `situacao_oc=4&somente_pendentes=false&tipo_despesa=MATERIA_PRIMA&data_emissao_ini=...&data_emissao_fim=...`.

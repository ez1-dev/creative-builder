## Card "V.A." — Campo pendente na API

Nenhuma alteração de código.

**Diagnóstico:** o rótulo "Campo pendente na API" (texto amarelo) aparece quando o backend **não envia** a chave `va` dentro de `kpis` no payload de `GET /api/rh/resumo-folha/dashboard`. Diferente de "Pendente" (valor `null`), aqui a chave está totalmente ausente — o frontend registra em `_missing_kpis` e renderiza esse aviso técnico via `KpiOrMissing`.

O frontend já está preparado para exibir o valor assim que o backend passar a incluir o campo — sem cálculo local, sem hardcode.

**Ação (backend):**
1. Incluir `va` em `response.kpis` conforme `docs/backend-rh-resumo-folha-dashboard.md` (fonte oficial: `SUM(VL_VALE_ALIMENTACAO)` da VM_FOLHA, ou o agregador equivalente da folha para Vale-Alimentação).
2. Se o valor legitimamente for zero/ausente no período, devolver `"va": null` (o card mostrará o badge "Pendente" em vez de "Campo pendente na API").
3. Verificar `diagnostico.vm_folha_componentes.vl_vale_alimentacao` — se estiver `0` ou ausente, é sinal de que a fonte de recarga do V.A. não foi carregada na VM_FOLHA para o período.

Assim que a chave `va` vier no payload, o card exibirá o valor automaticamente.
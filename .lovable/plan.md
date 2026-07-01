## Objetivo

Tratar a situação **VM_FOLHA_COMPAT_PENDENTE** na tela RH → 01 Resumo Folha, respeitando que `VETORH.dbo.VM_FOLHA` não existe fisicamente e que a camada compatível ainda está sendo construída pela API.

## Alterações

### 1. `src/lib/rh/api.ts`

- **`sincronizarResumoFolha`**: remover o fallback para `/api/rh/vm-folha/sincronizar` (não pode mais bater no endpoint que tenta ler VM_FOLHA física). Ordem final tentada:
  1. `POST /api/rh/vm-folha-compat/sincronizar?...`
  2. `POST /api/rh/resumo-folha/sincronizar?...` (fallback só se compat retornar 404/405)
- Se ambos retornarem 404/405, lançar erro tipado `SincronizacaoCompatIndisponivelError` com mensagem `"Sincronização compatível ainda não implementada na API."`.
- Exportar `sincronizarVmFolha` como **deprecated** (deixar comentário) mas não usar mais na página. Documentar que ela chama o endpoint legado que tenta VETORH.dbo.VM_FOLHA.
- Em `buildKpis`: além de tratar `"campo_pendente"` como missing, tratar também `null`/`undefined` como missing (já feito), garantindo que `R$ 0,00` só apareça quando o valor for numérico 0 explícito. Sem cálculos.

### 2. `src/pages/rh/ResumoFolhaPage.tsx`

- **Banner VM_FOLHA_COMPAT_PENDENTE** (novo, acima dos KPIs, visível a todos): quando `diagnostico.vm_folha_status === "OBJETO_INEXISTENTE_NO_VETORH"` **ou** `vm_folha_status === "VM_FOLHA_COMPAT_PENDENTE"`, renderizar aviso amarelo:
  > "VM_FOLHA não existe fisicamente no Vetorh. A API precisa calcular a camada compatível a partir das tabelas reais do ERP Senior/Vetorh."
- **Botão Sincronizar RH**: no `onError` da mutation, se o erro for `SincronizacaoCompatIndisponivelError`, exibir toast informativo (não destrutivo) com a mensagem: *"Sincronização compatível ainda não implementada na API."*
- **KPIs**: nenhuma soma no front. `ValueOrMissing`/`KpiOrMissing` já cobrem o caso `missing`; ajustar o texto para **"Campo pendente na API"** (em vez de "Campo não retornado pela API: X") conforme a nova regra. Manter o `field` como `title` para debug.
- **"Sem dados"**: quando `vm_folha_status` indicar compat pendente, não mostrar o card "Sem dados retornados pela API" (o banner já explica). Suprimir só nesse caso.
- Manter o restante intacto (mensal, proventos/descontos, filiais, diagnóstico admin). Continuar consumindo apenas `/api/rh/resumo-folha/dashboard?...&modo=completo`.

### 3. Aviso técnico abaixo dos cards

Manter texto atual: *"Indicadores retornados pela API a partir das tabelas oficiais do ERP Senior/Vetorh."*

## Fora de escopo

- Sem mudança em backend/edge functions.
- Sem alteração em outras telas RH.
- Sem cálculos client-side; sem consulta ao Cloud (Supabase) direta.

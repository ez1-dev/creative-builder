## Contexto

O usuário afirma que o backend agora devolve valores preenchidos para `kpis.inss_total`, `kpis.provisoes` e `kpis.fgts` em `GET /api/rh/resumo-folha/dashboard?modo=completo`. Os logs atuais do preview ainda mostram esses três campos como `null`, mas o front deve estar pronto para exibir os valores assim que a API responder.

Revisando `src/lib/rh/api.ts` (`buildKpis` + `KPI_ALIASES`) e `src/pages/rh/ResumoFolhaPage.tsx` (`KpiOrMissing`), a lógica atual já:
- marca o campo como missing apenas quando o valor é `null`/`""`/`"campo_pendente"`;
- exibe `KpiCard` com o valor numérico quando presente;
- não faz cálculo no front nem consulta o Cloud.

Ou seja, quando a API passar a devolver `inss_total = 3168072.07`, `provisoes = 2876060.97` e `fgts = 844058.67`, os três cards já sairão do estado "Campo pendente na API" automaticamente. Custo Total, Benefícios e Rescisões continuarão como pendentes enquanto vierem `null`.

## Plano

1. **Confirmar mapeamento 1:1 sem alias exótico** em `src/lib/rh/api.ts`:
   - Garantir que `KPI_ALIASES.inss_total`, `provisoes` e `fgts` leiam exatamente as chaves `inss_total`, `provisoes`, `fgts` do payload (sem inventar aliases que possam mascarar `null`).
   - Manter a regra atual: valor `null`/`""`/`"campo_pendente"` ⇒ entra em `_missing_kpis`; qualquer número (inclusive 0 explícito) ⇒ é exibido.

2. **Log de verificação** em `fetchResumoFolhaDashboard`:
   - Ampliar o `console.log` para imprimir também `_missing_kpis` após a normalização, facilitando validar no preview que `inss_total`/`provisoes`/`fgts` saíram da lista assim que a API entregar os valores.

3. **Sem mudanças em `ResumoFolhaPage.tsx`** além de garantir que os três cards continuam usando `KpiOrMissing` com `missing={isMissing("inss_total"|"provisoes"|"fgts")}` — nenhuma soma, nenhum fallback para `0`, nenhum acesso a Supabase.

4. **Validação** após o build:
   - Atualizar o preview em `/rh/resumo-folha` com o intervalo `202602–202607`.
   - Confirmar via console (`[RH ResumoFolha] dashboard`) que os três campos chegam preenchidos e que os cards renderizam o valor em BRL, enquanto `custo_total`, `beneficios` e `rescisoes` seguem com o badge "Campo pendente na API".

## Não fazer

- Não calcular INSS/Provisões/FGTS somando eventos no front.
- Não consultar `public.rh_vm_folha` nem qualquer tabela do Cloud.
- Não converter `null` em `R$ 0,00`.
- Não mexer na sincronização (`vm-folha-compat`) nem nos demais KPIs.

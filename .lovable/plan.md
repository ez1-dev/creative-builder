## Card "Líquido" — manter comportamento atual

Nenhuma alteração de código.

**Diagnóstico:** o badge "Pendente" em Provento / Desconto / Total Líquido aparece porque o endpoint `GET /api/rh/resumo-folha/dashboard` está devolvendo `kpis.provento`, `kpis.desconto` e `kpis.total_liquido` como `null`. O frontend está correto — a regra do projeto proíbe recalcular ou somar KPIs no React (nem a partir de `mensal[]`, `filiais[]` ou `proventos_vantagens[]`).

**Ação:** aguardar o backend preencher esses três campos conforme `docs/backend-rh-resumo-folha-dashboard.md` (`SUM(CALC_VL_PROVENTO_LIQ)`, `SUM(CALC_VL_DESCONTO_LIQ)`, `SUM(VL_LIQUIDO)`). Assim que a API responder com números, o card exibirá os valores automaticamente — sem qualquer mudança no frontend.

**O que verificar no backend:**
1. A sincronização (`POST /api/rh/vm-folha-compat/sincronizar`) rodou para o período selecionado?
2. `diagnostico.vm_folha_status` está `OK` e `qtd_linhas_vm_folha > 0`?
3. `diagnostico.vm_folha_componentes.calc_vl_provento_liq` / `calc_vl_desconto_liq` / `vl_liquido` estão populados?

Se sim e ainda vier `null` no `kpis`, é bug do agregador do backend.
## Alinhar Resumo Folha ao mapeamento oficial VM_FOLHA (UpQuery/BI JET)

O trabalho é majoritariamente de contrato de backend + pequenos ajustes de UI/diagnóstico no frontend. Os nomes dos KPIs (`provento`, `desconto`, `total_liquido`, `custo_total`, `beneficios`, `inss_total`, `hora_extra`, `provisoes`, `custo_ferias`, `rescisoes`, `fgts`) e da grid por filial já batem com o que a tela consome hoje — não muda layout nem cálculos no front.

### 1. Documentação de backend (fonte da verdade)
Reescrever `docs/backend-rh-resumo-folha-dashboard.md` para deixar explícito:
- Origem oficial: objeto `VM_FOLHA` (mesma do UpQuery/BI JET).
- Tabela de mapeamento **KPI → coluna VM_FOLHA** (exatamente o mapeamento enviado: `provento=SUM(CALC_VL_PROVENTO_LIQ)`, `desconto=SUM(CALC_VL_DESCONTO_LIQ)`, `total_liquido=SUM(VL_LIQUIDO)`, `custo_total=SUM(CALC_VL_CUSTO_TOTAL)`, `beneficios=SUM(CALC_VL_BENEFICIOS)`, `inss_total=SUM(CALC_VL_INSS_TOTAL)`, `hora_extra=SUM(CALC_VL_HORAS_EXTRA)`, `provisoes=SUM(CALC_VL_TOTAL_PROVISAO)`, `custo_ferias=SUM(CALC_VL_CUSTO_FERIAS)`, `rescisoes=SUM(CALC_CUSTO_TOTAL_RESCISAO)`, `fgts=SUM(VL_FGTS)`).
- Tabela de mapeamento **grid por filial → colunas VM_FOLHA** (mesmo mapeamento enviado; `qtd_horas`/`qtd_hora_extra` devem sair como string `HH:MM`).
- Nota sobre `salario_base`: backend precisa validar qual das duas colunas fecha `8.549.198,39` no período — `SUM(CALC_VL_SAL_BRUTO)` ou `SUM(VL_SALARIO)` — e usar a que bater.
- Tabela alvo Jan–Mai/2026 (números oficiais enviados) como aceite do endpoint.
- Regras de erro:
  - Nunca retornar `0.00` silenciosamente para um KPI cujo componente VM_FOLHA não foi encontrado.
  - Nesse caso, omitir o KPI de `response.kpis` (ou enviar `null`) e listar o nome do componente ausente em `response.diagnostico.componentes_pendentes[]` com `{ campo, motivo }`.
  - Se `VM_FOLHA` não tiver linhas no período, retornar `diagnostico.vm_folha_status = "SEM_CARGA"` e `qtd_linhas_vm_folha = 0` (comportamento que a UI já trata).
- Novo bloco obrigatório em `response.diagnostico`:
  ```json
  "vm_folha_componentes": {
    "calc_vl_provento_liq": 12537132.60,
    "calc_vl_desconto_liq": 6795671.53,
    "vl_liquido": 5741461.07,
    "calc_vl_custo_total": 18260200.42,
    "calc_vl_beneficios": 1060678.68,
    "calc_vl_inss_total": 3147442.33,
    "calc_vl_horas_extra": 1533612.20,
    "calc_vl_total_provisao": 2734855.50,
    "calc_vl_custo_ferias": 581462.67,
    "calc_custo_total_rescisao": 1408899.46,
    "vl_fgts": 840274.75,
    "vl_vale_alimentacao": 0,
    "vl_provisaoferias": 0,
    "vl_provisao13": 0,
    "vl_proventos": 0,
    "vl_descontos": 0
  }
  ```
- Reforço: `POST /api/rh/vm-folha/sincronizar` continua responsável por popular a VM_FOLHA antes do dashboard responder.

### 2. Frontend — apenas ajustes de diagnóstico e ausência
Sem mudar layout dos cards nem cálculos.

- `src/lib/rh/api.ts` (`buildKpis` / `normalizeDashboard`):
  - Tratar KPI ausente (`null` / `undefined` / não presente) como "campo pendente" — já existe `_missing_kpis`, manter.
  - **Importante**: se o backend enviar sentinel `"campo_pendente"` (string) num KPI, tratar igual a ausente (não converter para 0).
  - Encaminhar `diagnostico.vm_folha_componentes` e `diagnostico.componentes_pendentes` sem alteração.

- `src/pages/rh/ResumoFolhaPage.tsx`:
  - No bloco "Diagnóstico Técnico" (admin), renderizar `diagnostico.vm_folha_componentes` como lista formatada em BRL (mesmo padrão de `custo_total_componentes` atual).
  - Se `diagnostico.componentes_pendentes` vier populado, mostrar aviso amber listando quais componentes VM_FOLHA faltaram (visível a todos, não só admin — ajuda a explicar KPIs marcados como "Campo não retornado pela API").
  - Cards já usam `KpiOrMissing` / `ValueOrMissing`, então KPI ausente continua exibindo "Campo não retornado pela API" em vez de `R$ 0,00`.

### 3. Fora de escopo
- Não alterar `SincronizarRhDialog`, filtros, gráfico mensal, tabela por filial (nomes de campo já batem).
- Sem migrations, sem edge functions, sem tocar em Supabase.
- Não implementar o SQL da VM_FOLHA — responsabilidade do backend FastAPI. Este plano entrega o contrato e a UI para expor pendências.

### Arquivos afetados
- `docs/backend-rh-resumo-folha-dashboard.md` — reescrita com mapeamento oficial, alvo Jan–Mai/2026 e regras de erro.
- `src/lib/rh/api.ts` — tolerar sentinel `"campo_pendente"` como ausente; garantir que `diagnostico.vm_folha_componentes` e `componentes_pendentes` cheguem intactos à UI.
- `src/pages/rh/ResumoFolhaPage.tsx` — renderizar `vm_folha_componentes` no Diagnóstico Técnico e um aviso público quando houver `componentes_pendentes`.

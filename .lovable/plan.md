## Objetivo

Exibir os novos campos `kpis.salario_base` e `kpis.salario_bruto` já entregues pela API `GET /api/rh/resumo-folha/dashboard` na tela `/rh/resumo-folha`, sem qualquer cálculo no front.

## Alterações

### 1. `src/lib/rh/types.ts` — interface `ResumoFolhaKpis`
Adicionar os dois campos opcionais (opcional para tolerar respostas antigas):
```ts
salario_base?: number;
salario_bruto?: number;
```

### 2. `src/pages/rh/ResumoFolhaPage.tsx` — bloco `"kpis-resumo"`
Adicionar dois novos cards KPI usando o mesmo componente `KpiOrMissing` já existente, lendo direto de `kpis?.salario_base` e `kpis?.salario_bruto` (mesmo padrão dos demais — nenhuma soma/cálculo local):

- **"Salário Base"** → `value={kpis?.salario_base}` / `field="salario_base"`
- **"Salário Bruto"** → `value={kpis?.salario_bruto}` / `field="salario_bruto"` (variant `primary` para diferenciar visualmente do base)

Serão inseridos logo após o card "Líquido" e antes de "Custo Total", mantendo o grid responsivo atual (`lg:grid-cols-5`). Nenhuma outra alteração de layout.

### 3. `src/lib/rh/api.ts` — normalização de KPIs
Incluir `salario_base` e `salario_bruto` na lista de chaves reconhecidas para o cálculo de `_missing_kpis` (mesma lógica dos demais campos), de modo que a UI mostre "Campo não retornado pela API" se a API omitir. Nenhum fallback/cálculo — apenas passthrough do payload.

### 4. `docs/backend-rh-resumo-folha-dashboard.md`
Documentar os dois campos novos em `response.kpis` e a regra de origem (eventos 1, 2, 4, 26, 28, 56, 62, 126, 254, 278, 295 via R046FFR/R044CAL por `CAL.PERREF`). Registrar explicitamente que **não** usar R046INF.SALEMP, evento 393, evento 30 nem qualquer cálculo manual no front.

## Fora de escopo

- Não alterar `filiais[].salario_base` (grid por filial já existe e continua igual).
- Não mexer em relatórios PDF / IA insights nesta rodada — se o usuário quiser incluir nos relatórios, faço em passo separado.
- Nenhuma migration/RLS/edge function; o dado vem 100% da API FastAPI externa.

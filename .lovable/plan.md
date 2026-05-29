# Corrigir chamadas da aba "OPs Pintura/Jato"

A rota de listagem (`GET /api/auditoria-apontamento-genius/ops-jato-peso`) e a de componentes (`/{origem}/{numero_op}/componentes`) já estão corretas em `src/lib/api.ts`. Faltam três ajustes para bater 100% com a spec.

## Mudanças

### 1. `src/lib/api.ts` — `OpsJatoPesoFilters`
- Remover o campo `codemp` (não consta nos parâmetros aceitos).
- Adicionar `nivel_maximo?: number` (parâmetro previsto na spec, hoje ausente).

### 2. `src/pages/auditoria-genius/OpsJatoPesoTab.tsx`
- **Export Excel**: trocar o endpoint do `<ExportButton>` de  
  `/api/auditoria-apontamento-genius/ops-jato-peso` (com `exportar_excel=true`)  
  para a rota dedicada  
  `/api/export/auditoria-apontamento-genius/ops-jato-peso`,  
  removendo o flag `exportar_excel` dos params.
- **Filtro Empresa (`codemp`)**: remover do `FormState`, do `initialForm`, do `buildApiFilters` e o input "Empresa" do `FilterPanel` (parâmetro não suportado pela API).

### 3. Sem mudanças em
- `OpsJatoComponentesSheet.tsx` (rota correta).
- `getOpsJatoPeso` / `getOpsJatoPesoComponentes` (URLs corretas; segue mandando `usar_multinivel=true` por padrão e header `Authorization: Bearer` via `api.get`).
- Componente `ExportButton` (já envia `Authorization` e `ngrok-skip-browser-warning`).

## Fora de escopo
- Expor `nivel_maximo` na UI (apenas tipa o filtro; UI pode ser adicionada depois se necessário).
- Mudar lógica de status_peso, KPIs ou drawer de componentes.

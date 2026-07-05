## Objetivo
Substituir a página `/rh/contrato-experiencia` pela versão nova baseada no endpoint `GET /api/rh/contrato-experiencia/dashboard?codemp=1`, no mesmo padrão visual das outras telas RH (KpiCard + tabela com badge de status).

## Alterações

### 1. `src/lib/rh/types.ts`
Adicionar tipos do novo dashboard:
```ts
export interface ContratoExperienciaKpis {
  qtde_contratos: number;
  demitidos_30_apos_exp: number;
  a_vencer_5_dias: number;
  a_vencer_10_dias: number;
}
export interface ContratoExperienciaVencimento {
  empresa: string; filial: string; cargo: string;
  matricula: string; colaborador: string;
  dt_admissao: string; dt_vencimento: string;
  dias_restantes: number;
  status: "A VENCER" | "A VENCER 10 DIAS" | "A VENCER 5 DIAS" | "VENCIDO" | string;
}
export interface ContratoExperienciaDashboard {
  kpis: ContratoExperienciaKpis;
  vencimentos: ContratoExperienciaVencimento[];
}
```
(Manter `ContratoExperienciaItem` e `fetchContratoExperiencia` existentes — não remover para não quebrar imports.)

### 2. `src/lib/rh/api.ts`
Adicionar `fetchContratoExperienciaDashboard(codemp = 1)` chamando `/api/rh/contrato-experiencia/dashboard` com `cleanParams({ codemp })`, retornando `ContratoExperienciaDashboard` com defaults seguros (`kpis` zerados, `vencimentos: []`).

### 3. `src/pages/rh/ContratoExperienciaPage.tsx` (reescrever)
- `RhPageHeader title="03 — Contrato Experiência"`.
- `useQuery(["rh","contrato-experiencia","dashboard", codemp])` → `fetchContratoExperienciaDashboard(1)`. Em erro: `toast.error` (Sonner) com mensagem; se `status === 401`, mensagem "Sessão expirada".
- 4 `KpiCard` (grid `md:grid-cols-4`): "Qtde Contratos" (FileText), "Demitidos 30 Após Exp." (UserMinus, `variant="warning"`), "A Vencer 5 Dias" (Clock, `variant="danger"`), "A Vencer 10 Dias" (CalendarClock, `variant="warning"`). `format="number"`, `loading` do query.
- Tabela "Vencimentos" (Card + shadcn Table, header sticky, `max-h-[70vh]`): colunas Empresa, Filial, Cargo, Colaborador, Data Admissão, Segundo Vencimento, Status.
- Ordenar client-side por `dt_vencimento` asc (defensivo).
- Datas via `new Date(...).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"})`.
- Badge de Status com classes semânticas (tokens do design system, sem cores hardcoded):
  - `VENCIDO` → `bg-destructive/15 text-destructive`
  - `A VENCER 5 DIAS` → `bg-destructive/10 text-destructive` (variante mais suave / laranja escuro)
  - `A VENCER 10 DIAS` → `bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]`
  - `A VENCER` → `bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]`
- Skeleton nas linhas enquanto `isLoading`; empty state "Nenhum contrato".
- Sem filtros (API já entrega vigentes).

Rota em `src/App.tsx` já existe — nenhuma alteração ali.

## Fora de escopo
- Backend / restart da 8070.
- Ajuste da janela de "Demitidos 30 Após Exp." (backend).
- Filtros na UI.

## Objetivo
Aplicar a direção **Command bar compacta** ao layout da tela `Impressão de Ordem de Produção`, mantendo toda a lógica/integrações existentes.

## Mudanças

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

1. **Header (substitui o `PageHeader` atual):**
   - Breadcrumb pequeno: `MCAP700.GER / Genius / Produção`.
   - Título `Impressão de Ordem de Produção` em `text-xl font-bold`.
   - Barra de ações à direita: **Consultar** (primário sólido) → divider vertical → `Visualizar`, `Imprimir`, `Gerar PDF` (outline) → `Limpar` (outline com tom destrutivo).

2. **Card de filtros (substitui o grid 4×3):**
   - Card com 3 grupos lado a lado, separados por `divide-x` (empilha em telas estreitas).
   - **Grupo 1 — Origem e Destino** (fundo `bg-muted/30`, dot `bg-primary`): Empresa, Pedido, Relatório de Produção.
   - **Grupo 2 — Contexto da Produção** (dot neutro): Origem, Situação, Ordem de Produção, Estágio.
   - **Grupo 3 — Refinamento** (dot neutro): Centro de Recurso, Componentes (S/N), Desenhos (S/N).
   - Cada grupo com header `text-[11px] font-bold uppercase tracking-wider text-muted-foreground` + bolinha indicadora.

3. **Tokens semânticos apenas** — sem cores hardcoded; mapear o protótipo para:
   - `bg-slate-*` → `bg-muted/30` / `bg-card` / `bg-background`
   - `text-slate-*` → `text-foreground` / `text-muted-foreground`
   - `bg-blue-*` → `bg-primary`
   - `text-red-*` → `text-destructive`
   - `border-slate-*` → `border-border`

4. **Mantido sem alteração:**
   - Grid de OPs, botão "Imprimir todas", impressão em lote, OpPrintSheet/OpPrintBatch.
   - Toda a lógica de filtros, hooks, fetchers, validações.
   - Empty states (apenas reuso dos atuais).

### Fora de escopo
- Backend, hooks, design tokens globais, demais telas.

### Regras mantidas
- Identidade azul corporativa.
- Nunca usar cores hardcoded.
- Nenhuma mudança de comportamento, só visual/organizacional.
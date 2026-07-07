# Unificar configuração dos widgets do RH com a Biblioteca BI

## Diagnóstico

Hoje o RH usa `ConfigureRhWidgetDialog`, que só permite:
- escolher componente da Biblioteca BI,
- mapear campos (kpis/series),
- renomear o título.

Enquanto isso, a Biblioteca BI (`ConfigureBiWidgetDialog` + `VisualConfigEditor`, usado em `/biblioteca-bi` e em Passagens) já expõe:
- Trocar tipo de gráfico (variantes) e cores/paleta.
- Formato de números (int / decimal / moeda / percentual / compacto).
- Mostrar/ocultar % (data labels), legenda (posição), grade, rótulo dos eixos.
- Densidade do card, alinhamento e fonte do título, descrição do resultado.
- Variantes semânticas de KPI (`info/success/warning/danger`), sparkline e meta.

O gap é só de UI: os cards do RH já leem `options.visual` via `ChartCardShell` (confirmado em `RhDashboardGrid.tsx` linhas 69-81 — `options` é passado para `def.render`). Ou seja, basta o diálogo do RH gravar `options.visual` que a renderização já respeita.

## O que será feito (somente RH)

### 1. `src/components/rh/ConfigureRhWidgetDialog.tsx`
- Reorganizar em abas: **Componente**, **Dados** (mapping + título), **Aparência**.
- Aba **Aparência**: embutir `<VisualConfigEditor>` (mesmo componente da Biblioteca BI) alimentando `options.visual`.
- Aba **Componente**: quando o widget for do tipo KPI, adicionar seletor de **Variante** (`info/success/warning/danger/neutral`) e formato (`number/currency/percent/compact`) gravados em `options`.
- Preview lateral (já existe) passa a receber `options` completo para refletir mudanças em tempo real.
- `onSave` estendido para incluir `options` (o hook `useRhModuleLayout.configureWidget` já aceita `options` — linhas 449-464).

### 2. `src/components/rh/RhDashboardGrid.tsx`
- Para blocos **padrão** (sem `componentId`), envolver o bloco em um wrapper que aplica `options.visual` mínimo (densidade + alinhamento do título + fonte). Gráficos padrão que já usam `ChartCardShell` recebem automaticamente; para os que não usam, deixar sem efeito e deixar claro no diálogo ("algumas opções só se aplicam a componentes da Biblioteca").
- Widgets KPI padrão do RH: passar `variant` e `format` quando presentes em `options`.

### 3. `src/hooks/useRhModuleLayout.ts`
- Nenhuma mudança de schema: o campo `options` já existe e é persistido em `rh_module_layout` (linhas 35, 48, 164, 212, 253). Confirmar apenas que no fluxo staged (Salvar edição) `options` entra no diff.

### 4. Sem mudanças em backend / migrations
Persistência já é `options jsonb`; não requer alteração de tabelas nem GRANTs.

## Escopo NÃO incluído
- Passagens, Frota, Máquinas, Comercial ficam como estão (usuário pediu "Somente RH").
- Formulários e Relatório Gerencial continuam sem editar layout.

## Validação
1. Abrir qualquer página RH → Editar layout → engrenagem em um gráfico.
2. Aba Aparência: alternar formato de número, esconder %, mover legenda, mudar paleta → preview atualiza.
3. Aba Componente em um KPI: trocar variante para `success` → preview fica verde.
4. Salvar edição → recarregar página → configurações persistem.
5. Cancelar edição → mudanças de aparência são descartadas junto com layout (já suportado pelo staged edit).

## Detalhes técnicos
- Reaproveita 100% de `VisualConfigEditor` e `mergeVisualConfig` — nada novo em `src/lib/bi/visualConfig.ts`.
- `ConfigureRhWidgetDialog` cresce ~120 linhas (abas + estado de `visual`).
- Chart cards que não passam por `ChartCardShell` (raro no RH) ficam imunes; documentar no cabeçalho do diálogo.

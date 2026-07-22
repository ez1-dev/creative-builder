# Melhorar estrutura e organização do toolbar de ações

Escopo: arquivo `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — bloco "AÇÕES" (linhas ~2083–2235). Mudanças apenas visuais/estruturais; nenhuma lógica de cálculo, filtro, cache ou drill é tocada.

## Objetivo
Hoje a barra é uma única linha `flex-wrap` com três grupos (Dados / Saída / Visualização). Na DRE Padrão sobram poucos botões (Carregar ano, Atualizar Resultado, Recalcular, refresh, Exportar) e a linha fica desalinhada com o bloco de Visualização — como mostra o print anexo. Vamos deixar a hierarquia mais clara, com respiro, alinhamento consistente e melhor comportamento responsivo.

## Nova estrutura visual

```text
┌────────────────────────────────────────────────────────────────────────┐
│  AÇÕES                                                                 │
│  ┌──────────────────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Dados                    │ | │ Saída        │ | │ Visualização   │  │
│  │ [Carregar ano] primary   │ | │ [Exportar]   │ | │ [Modo][Nível]  │  │
│  │ [Atualizar Resultado]    │ | │ [Histórico]* │ | │ [⇅ tudo][⇵]    │  │
│  │ [Recalcular]  [⟳]        │ | │ [Editar]*    │ | │ [Centavos]     │  │
│  │ [Vincular]* [Cache SR]*  │ |                   │                │  │
│  └──────────────────────────┘   └──────────────┘   └────────────────┘  │
│                                                                        │
│  * itens só aparecem fora do modoBloqueado / conforme já hoje          │
└────────────────────────────────────────────────────────────────────────┘
```

### Mudanças concretas

1. Card externo continua `rounded-xl border bg-white shadow-sm`, mas com padding um pouco maior (`p-4`) e `gap-y-4` para respiro entre grupos ao quebrar linha.
2. Cada grupo (Dados / Saída / Visualização) vira um bloco com:
   - Rótulo `Dados` / `Saída` / `Visualização` acima (não mais inline), em `text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5`.
   - Container `flex flex-wrap items-center gap-2`.
3. Divisores verticais (`h-8 w-px bg-slate-200`) substituídos por um espaçamento maior (`gap-x-6`) + rótulos como separadores visuais. Divisor só permanece antes de Visualização em telas ≥ md.
4. Visualização deixa de depender de `ml-auto` puro:
   - Em telas grandes (`lg:`), fica alinhada à direita.
   - Em telas médias/pequenas, quebra para uma segunda linha alinhada à esquerda, mantendo a mesma altura visual dos outros grupos (hoje ela "desce" fora de linha, como no print).
5. Botão "Carregar ano" continua primário; os demais em `variant="outline"`. Botão de refresh (`RefreshCw`) vira ícone puro `variant="ghost" size="icon"` com `title` — remove o vão vazio ao lado.
6. Botão "Com centavos / Sem centavos" ganha ícone (`Coins`) para casar visualmente com o resto do grupo Visualização.
7. Selects de Modo e Nível ganham largura consistente (`w-[130px]` e `w-[120px]`) e `h-9` (mesma altura dos botões `size="sm"` com ícone) para ficarem alinhados verticalmente com os controles Expandir/Recolher.
8. Grupo Expandir/Recolher (`ChevronsUpDown` / `ChevronsDownUp`) mantido como toggle group, também `h-9`, com `title` melhor ("Expandir todos os níveis" / "Recolher todos os níveis").
9. Quando `modoBloqueado` (DRE Padrão): grupo "Saída" mostra só "Exportar" — ok como hoje, mas alinhado no novo layout com rótulo próprio.
10. Acessibilidade: cada grupo vira `<section aria-label="Ações de dados" />` etc.; botões só-ícone recebem `aria-label`.

## Não faz parte deste plano
- Nenhuma alteração em filtros, cache, drill, exportação, cálculo, endpoints, `modoBloqueado`, permissões ou textos de negócio.
- Nenhum arquivo além de `DreStudioVisualizacaoPage.tsx`.
- Painéis abaixo da toolbar (Filtros, Conciliação, grid) ficam como estão.

## Detalhes técnicos
- Trocar o wrapper atual `<div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3">` por um grid responsivo:
  `className="grid gap-4 p-4 md:grid-cols-[auto_auto_1fr] md:items-start"`.
- Cada grupo em `<div className="flex flex-col gap-1.5">` com header (label) + linha de controles.
- Divisor `md:before:content-[''] md:before:w-px md:before:bg-slate-200` apenas no grupo Visualização para separar de Saída.
- Preservar todas as props/handlers atuais (`handleCarregarAnoInteiro`, `handleSincronizar`, `setConfirmRecalcular`, `handleAtualizarCacheSenior`, `vincular.mutate`, `handleRecarregar`, `handleExportarExcel`, `setOpenHistoricoCache`, `setEditorEstruturaOpen`, `setModo`, `aplicarNivel`, `expandirTudo`, `recolherTudo`, `mostrarTecnicas`, `semCasasDecimais`).
- Manter todos os `disabled`, `title` e condicionais (`isBalanco`, `tipoModelo === "BALANCO"`, `!modoBloqueado`, etc.) exatamente como estão.

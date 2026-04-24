

## Modernização visual da página Auditoria Apontamento Genius

Foco: tornar a página mais clara, hierárquica e operacional para o time de PCP, sem mudar regras de negócio nem dados.

### O que muda visualmente

**1. Header executivo (sticky)**
- Cabeçalho compacto fixo no topo ao rolar, com:
  - Título + breadcrumb leve ("Produção › Auditoria Genius").
  - Chips do período ativo (ex.: `01/04 → 24/04`, `Origem: 200`, `Status: Todos`) — clicáveis para limpar.
  - Bloco de status: ícone verde/amarelo/vermelho + "Atualizado há 2 min" + Auto-refresh + Exportar.
- Resultado: o usuário sempre vê qual recorte está olhando.

**2. Filtros — painel lateral colapsável (Sheet)**
- Trocar o `FilterPanel` longo por um botão "Filtros (3)" que abre um `Sheet` lateral à direita.
- Atalhos de período viram **chips horizontais** (Hoje, Ontem, Esta semana, Sem. anterior, Mês, 12 meses) sempre visíveis acima da área de KPIs — sem precisar abrir filtros.
- Switch "Somente acima de 8h" também vira chip-toggle visível.
- Badge no botão Filtros mostra quantos filtros estão ativos.

**3. KPIs reorganizados em 3 grupos visuais**
Hoje há 12 KPIs misturados. Reagrupar em 3 faixas com título sutil:
```text
Volume:        [Total] [Emitidas] [Liberadas] [Andamento] [Finalizadas] [Canceladas]
Saúde dados:   [Discrepâncias] [Sem início] [Sem fim] [Fim<Início]
Carga horária: [Acima 8h] [Abaixo 5min] [Maior total/dia]
```
- KPIs com cor discreta na lateral esquerda (border-l-4) por categoria: azul=volume, âmbar=saúde, vermelho=horas.
- Tamanho menor (h-20), tipografia mais leve, número grande à direita, ícone à esquerda.
- Card "Status OP Genius" e "Alerta >8h" entram como faixa-resumo no topo dos KPIs (1 linha colorida estilo "banner de saúde").

**4. Resumo por Operador — visual de card moderno**
- Header do card com avatar circular do ícone, título + total geral em destaque (`128h 45min`) e botão "Expandir/Recolher".
- Tabela ganha:
  - Coluna **Carga** com mini-barra horizontal (% relativo ao operador com mais horas) — leitura rápida de quem mais apontou.
  - Linhas com hover azul claro + cursor pointer (já clicável).
  - Badge colorido na coluna Horas: verde ≤8h/dia médio, âmbar 8–10h, vermelho >10h.

**5. Tabela principal**
- Toolbar acima da tabela: filtro rápido (já existe) + contador "X de Y" + botão "Densidade" (compacta/confortável) + "Colunas" (mostrar/ocultar).
- Linhas com discrepâncias ganham faixa colorida na primeira coluna (4px) ao invés de fundo inteiro — menos ruído.
- Skeleton loading mais elegante (animação shimmer já existe).

**6. Estados vazios e alertas**
- Empty state ilustrado com ícone grande + CTA "Ajustar filtros".
- Alertas de erro/diagnóstico em accordion fechado por padrão (não dominam a tela).

**7. Tema visual**
- Espaçamentos consistentes (gap-4 em tudo).
- Bordas arredondadas `rounded-lg` em todos cards.
- Sombras sutis `shadow-sm` em vez de bordas pesadas.
- Cores semânticas via tokens HSL já existentes (sem hardcode).
- Tipografia: títulos `font-semibold tracking-tight`, números tabulares (`tabular-nums`) para alinhar dígitos.

### Layout final (esquemático)

```text
┌─────────────────────────────────────────────────────────┐
│ Auditoria Genius   [chips período]   ● Online · Export  │ ← sticky
├─────────────────────────────────────────────────────────┤
│ [Hoje][Sem.][Mês][12m]  [Filtros (3)]  [□ >8h]          │
├─────────────────────────────────────────────────────────┤
│ ⚠ 12 apontamentos acima de 8h · Ver detalhes →          │ ← banner
├─────────────────────────────────────────────────────────┤
│ Volume       │ KPI KPI KPI KPI KPI KPI                  │
│ Saúde dados  │ KPI KPI KPI KPI                          │
│ Carga horária│ KPI KPI KPI                              │
├─────────────────────────────────────────────────────────┤
│ 👤 Operadores no período · 128h 45min · 42 OPs   [▼]    │
│   Cód  Nome     OPs  Carga ▓▓▓▓░ 80%   Horas  Min  Apt │
├─────────────────────────────────────────────────────────┤
│ [🔍 buscar]  120 de 1500   [Densidade] [Colunas]        │
│ Tabela principal de apontamentos…                       │
└─────────────────────────────────────────────────────────┘
```

### Arquivos afetados
- `src/pages/AuditoriaApontamentoGeniusPage.tsx` (reorganização de JSX e classes; lógica intacta).
- Novo: `src/components/erp/PeriodChips.tsx` (chips de atalho reutilizáveis).
- Novo: `src/components/erp/KpiGroup.tsx` (wrapper visual para grupos de KPIs).
- Pequenos ajustes em `KPICard.tsx` (variante compacta com border-l-4).

### Garantias
- Nenhuma alteração em chamadas de API, parâmetros, agregações ou cálculos de horas/minutos.
- Filtros, paginação, drill-down, auto-refresh e exportação continuam funcionando idênticos.
- Responsivo: mobile mostra KPIs em 2 colunas e filtros em Sheet full-screen.


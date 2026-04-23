

## Auditoria de responsividade em todas as telas

### Objetivo
Verificar e corrigir o comportamento responsivo do app em todos os tamanhos de tela (desktop grande, laptop, tablet, mobile) e em todos os módulos, garantindo que ao minimizar/maximizar a janela nada quebre, sobreponha ou fique cortado.

### Escopo da auditoria

**Telas a auditar (todas as rotas do app):**
- Login, Dashboard (Index)
- Painel de Compras, Compras Produto, Notas Recebimento, Conciliação eDocs
- Contas a Pagar, Contas a Receber, Auditoria Tributária
- Estoque, Estoque Min/Max, Sugestão Min/Max
- BOM, Onde Usa, Engenharia Produção, Número Série
- Auditoria Apontamento Genius
- Produção (Dashboard, Lead Time, Não Carregados, Expedido Obra, Produzido Período, Saldo Pátio)
- Configurações

**Breakpoints a validar:**
- 1920x1080 (desktop grande)
- 1536x864 (laptop padrão)
- 1366x768 (laptop pequeno)
- 1024x768 (tablet landscape)
- 820x1180 (tablet portrait)
- 414x896 (mobile grande)
- 375x812 (mobile padrão)

### Pontos críticos conhecidos a verificar

1. **AppLayout / Sidebar** — colapso automático em <768px, hambúrguer funcional, header não quebra com nome longo do usuário
2. **Painéis de filtros** (`FilterPanel`) — wrapping correto dos campos em larguras pequenas, sem overflow horizontal
3. **DataTable** — scroll horizontal com sticky columns (já implementado), mas validar em mobile se os dados continuam legíveis
4. **KPICards** (grid de KPIs) — re-flow de 4 colunas → 2 → 1 conforme largura
5. **Charts** (Recharts em ProducaoDashboard, etc.) — `ResponsiveContainer` realmente responde, sem altura fixa quebrando
6. **AiAssistantChat** — painel flutuante com `useAiPanelPlacement` deve virar drawer/full-screen em mobile (já há `isMobile` no hook)
7. **Modais/Sheets/Dialogs** — não estouram a viewport em telas pequenas
8. **Tabs/Submenus** — overflow com scroll horizontal quando muitas abas
9. **PageHeader** — título + ações não colidem em larguras estreitas
10. **FinanceiroTreeTable** — indentação da árvore em mobile

### Plano de execução

#### Fase 1 — Inspeção automatizada (browser)
Para cada combinação rota × breakpoint:
1. `browser--navigate_to_sandbox` na rota com `width`/`height` do breakpoint
2. `browser--screenshot` para inspeção visual
3. `browser--read_console_logs` para capturar warnings de layout
4. Registrar problemas em uma tabela (rota, breakpoint, problema, severidade)

Priorização (não testar 20 rotas × 7 breakpoints = 140 combinações; usar amostragem inteligente):
- **Alta prioridade**: rotas mais usadas (Painel Compras, Contas Pagar, Estoque, Produção Dashboard, Auditoria Genius) em **375px, 768px, 1366px, 1920px**
- **Média**: demais rotas em **375px e 1366px**
- **Baixa**: Configurações, NotFound em **1366px** apenas

Total estimado: ~40 combinações.

#### Fase 2 — Catalogação de problemas
Agrupar achados por tipo:
- **A. Overflow horizontal** (scroll lateral indesejado no `<body>`)
- **B. Sobreposição** (elementos em cima de outros)
- **C. Texto/conteúdo cortado** (truncate sem tooltip, overflow:hidden engolindo info)
- **D. Componente inutilizável em mobile** (botões pequenos demais, modais > viewport)
- **E. Quebra de grid/flex** (cards empilhando errado)
- **F. Charts com altura colapsada** (0px height)

#### Fase 3 — Correções
Para cada problema, aplicar a correção mínima:
- Trocar `grid-cols-4` por `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` quando faltar
- Adicionar `overflow-x-auto` em containers de tabelas/tabs que estiverem sem
- Trocar `Dialog` por `Drawer` em mobile quando o conteúdo for grande (usando `useIsMobile`)
- Adicionar `min-w-0` em flex children que estão estourando
- Adicionar `truncate` + `title` em textos longos no header
- Garantir `ResponsiveContainer` com `min-h-[Xpx]` em wrappers de chart
- Wrapping (`flex-wrap`) em barras de ações do `PageHeader`

#### Fase 4 — Re-validação
Após correções, re-testar as combinações que tinham problema para confirmar o fix, e fazer um spot-check em 3-4 outras rotas para garantir que nada regrediu.

### Entregáveis
1. **Relatório de auditoria** (no chat) listando por rota:
   - ✅ OK em todos breakpoints, ou
   - ⚠️ Problemas encontrados + severidade + correção aplicada
2. **Código corrigido** nos arquivos com problema (esperado: 5-15 arquivos, principalmente pages, FilterPanel, PageHeader, AppLayout)
3. **Screenshots de antes/depois** dos casos mais críticos

### Fora de escopo
- Redesign visual (mudança de paleta, tipografia, espaçamentos por gosto)
- Reescrever DataTable ou Sidebar do zero
- Otimização de performance (foco aqui é só layout)
- PWA / orientação landscape em mobile (se já funciona, mantém)

### Riscos
- Algumas correções de grid podem afetar a densidade visual em desktop — quando houver tradeoff, priorizar **não quebrar mobile** mantendo desktop "bom o suficiente".
- Charts com tooltip podem se comportar mal em touch — se aparecer, aplicar fix pontual sem refatorar Recharts.

### Estimativa
~40 inspeções + ~10 arquivos editados. Trabalho concentrado em uma rodada de exploração + uma rodada de patches + uma rodada de re-validação visual.


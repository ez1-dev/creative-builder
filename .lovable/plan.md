## Objetivo

Deixar o app inteiro responsivo (mobile → tablet → desktop wide) e permitir instalação como PWA (ícone na tela inicial), sem modo offline. O trabalho é 100% de layout/apresentação — nada de lógica, dados ou contratos de API muda.

## Diagnóstico

- `AppLayout` header: `h-11 3xl:h-14` fixo, `HeaderInfo` sem controle de largura, botão "Sair" com ícone-only só em `<sm`. Em mobile o header comprime bem.
- `AppSidebar` (shadcn) já é responsiva: `useIsMobile` (<768 px) transforma em drawer (Sheet). `SidebarTrigger` já está no header. **Nada a mudar aqui.**
- Páginas fora do RH: maioria usa `space-y-4 p-4` (já fluido). Casos problemáticos: `container mx-auto py-*` (só RH — já corrigido), tabelas sem `overflow-x-auto`, filtros/toolbars em `flex items-center gap-2` sem `flex-wrap`, KPI grids com breakpoints hardcoded (`md:grid-cols-5`, `md:grid-cols-6`), diálogos com `max-w-*` fixo.
- `PainelComprasPage` (rota atual): wrapper `space-y-4 p-4` ok, mas linha 903 `flex flex-wrap items-center gap-2` já wrap; várias sublinhas com grids fixos precisarão de checagem.
- PWA: `public/manifest.json` já existe (`display: standalone`, name, cores). `public/icon-192.png` e `icon-512.png` já estão em `public/`. `index.html` já tem tags `manifest`, `theme-color`, `apple-mobile-web-app-*`, `apple-touch-icon`. **A infra PWA manifest-only já está no ar** — precisa apenas de auditoria/ajustes finais.

## Implementação

### 1. Auditar/consolidar o app-shell responsivo
- `src/components/AppLayout.tsx`
  - Garantir que o `<main>` tenha `overflow-x-hidden` como fallback (mantendo `overflow-auto` no eixo Y) para bloquear vazamentos.
  - Header: manter estrutura atual, apenas assegurar que `HeaderInfo` receba `min-w-0 truncate` no wrapper.
- `src/components/HeaderInfo.tsx`
  - Truncar textos longos, esconder itens secundários em `<md` com `hidden md:inline-flex`.
- `src/components/erp/AiAssistantChat.tsx` (verificar): posicionamento do botão flutuante deve respeitar `bottom-safe` no mobile.

### 2. Auditoria PWA manifest-only
- Revisar `public/manifest.json`: confirmar campos `id`, `scope`, `orientation: "any"`. Adicionar `icons[].purpose: "any maskable"` para melhor render Android.
- Confirmar `index.html`: tudo já presente. Apenas garantir `<link rel="icon" href="/favicon.ico" ...>` continua servindo como fallback (não mexer no favicon).
- Testar em Playwright mobile: manifest carrega, sem erro no console.

### 3. Padrões responsivos aplicados por sweep
Criar utilitário `src/lib/ui/responsive.ts` (ou reaproveitar `src/components/bi/utils/responsive.ts` já existente) e usar como referência. Aplicar por regex-guided sweep nas páginas listadas abaixo:

**Padrões a substituir (só quando literal, sem `sm:`/`md:` companheira):**
- `flex items-center gap-2` em headers/toolbars com muitos botões → `flex flex-wrap items-center gap-2`
- `grid grid-cols-N` sem breakpoints menores → adicionar `grid-cols-1 sm:grid-cols-2 md:grid-cols-N`
- Tabelas em `<Table>` sem wrapper → envolver com `<div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">`
- `DialogContent` com `max-w-{2xl|3xl|4xl}` → prefixar `max-w-[95vw] sm:` mantendo o valor original
- Botões com labels longos em toolbars → `<span className="hidden sm:inline">Texto</span>` quando aplicável

**Páginas alvo (aplicação pontual, mudanças mínimas e cirúrgicas):**

BI / Dashboards:
- `src/pages/PainelComprasPage.tsx` (rota atual — prioridade)
- `src/pages/FaturamentoGeniusPage.tsx`
- `src/pages/NotasRecebimentoPage.tsx`
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx`
- `src/pages/Index.tsx`
- `src/pages/bi/**/*.tsx` (comercial, contabilidade, financeiro)

Operacionais:
- `src/pages/EstoquePage.tsx`, `EstoqueMinMaxPage.tsx`, `SugestaoMinMaxPage.tsx`
- `src/pages/ComprasProdutoPage.tsx`, `ContasPagarPage.tsx`, `ContasReceberPage.tsx`
- `src/pages/ConciliacaoEdocsPage.tsx`, `NumeroSeriePage.tsx`
- `src/pages/producao/**`, `src/pages/cadastros/**`, `src/pages/relatorios/**`
- `src/pages/ManutencaoFrotaPage.tsx`, `ManutencaoMaquinasPage.tsx`, `PassagensAereasPage.tsx`
- `src/pages/EngenhariaProducaoPage.tsx`, `BomPage.tsx`, `OndeUsaPage.tsx`
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`, `AuditoriaTributariaPage.tsx`
- `src/pages/regras-senior/**`, `src/pages/auditoria-genius/**`
- `src/pages/MonitorUsuariosSeniorPage.tsx`, `GestaoSguUsuariosPage.tsx`
- `src/pages/ConfiguracoesPage.tsx`, `EtlAdminPage.tsx`, `EtlTarefaDetalhePage.tsx`

### 4. Validação
- Playwright em viewports 375×812, 768×1024 e 1440×900 em rotas-chave: `/`, `/painel-compras`, `/bi/comercial/*`, `/estoque`, `/faturamento-genius`, `/contas-pagar`, `/notas-recebimento`, `/producao/programacao`, `/rh` (já feito), `/configuracoes`. Screenshot + checar `document.documentElement.scrollWidth - clientWidth === 0`.
- Verificar console/network limpos.
- Confirmar drawer da sidebar abre/fecha em mobile.
- Testar manifest via `curl` do endpoint `/manifest.json` local.

## Fora de escopo

- Nenhuma mudança em `src/lib/**` (exceto criação eventual do helper responsivo).
- Nenhuma alteração em contratos de API, hooks de dados, RLS ou edge functions.
- Nenhuma mudança em cores/tokens do design system.
- Sem service worker / modo offline.
- Sem redesenhar componentes — só ajustar breakpoints, wraps e paddings.

## Arquivos afetados (estimativa)

- **Editar**: `src/components/AppLayout.tsx`, `src/components/HeaderInfo.tsx`, `public/manifest.json`, mais ~30-40 páginas (edições pontuais de 1-3 linhas cada em headers/filtros/tabelas).
- **Criar (opcional)**: `src/lib/ui/responsive.ts` com helpers compartilhados.

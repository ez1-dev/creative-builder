## Reestruturar menu lateral em ERP / HCM / Configurações

Refatorar **`src/components/AppSidebar.tsx`** por completo (único arquivo alterado). Nenhuma rota, permissão ou página é modificada — só a árvore do menu, o comportamento accordion e o fechamento em mobile.

### 1. Nova estrutura de dados

Trocar o array `GROUPS` atual por uma árvore de três níveis:

```ts
type Leaf = { title: string; url: string; icon: any };
type SubGroup = { id: string; label: string; icon: any; items: Leaf[] };
type TopMenu =
  | { id: string; label: string; icon: any; kind: 'leaf'; item: Leaf }
  | { id: string; label: string; icon: any; kind: 'flat'; items: Leaf[] }
  | { id: string; label: string; icon: any; kind: 'nested'; subGroups: SubGroup[] };
```

Cinco topos, nesta ordem:

1. **Favoritos** — renderizado à parte (já existe `renderFavoritesGroup`), tratado como topo accordion.
2. **Início** (`Home`) — leaf → `/dashboard-geral`.
3. **ERP** (`Package`) — nested; ver mapa abaixo.
4. **HCM** (`Users`) — flat; ver mapa abaixo.
5. **Configurações** (`Settings`) — flat; ver mapa abaixo.

Nenhum topo "Terceiros".

### 2. Mapa exato (usando as URLs que o usuário passou)

**ERP → subgrupos:**
- `Produção` (Factory): /producao/dashboard · /producao/produzido · /producao/expedido · /producao/patio · /producao/nao-carregados · /producao/leadtime · /producao/engenharia · /producao/relatorio-semanal-obra · /producao/impressao-op · /producao/carga · /producao/carga/dashboard · /producao/carga/recursos · /producao/programacao
- `Compras e Suprimentos` (ShoppingCart): /compras-produto · /painel-compras · /demonstrativo-compras-recebimentos · /auditoria-tributaria · /notas-recebimento
- `Estoque` (Warehouse): /estoque · /estoque-min-max · /sugestao-min-max · /onde-usa · /bom · /numero-serie
- `Financeiro e Contábil` (Landmark): /conciliacao-edocs · /contas-pagar · /contas-receber · /contabilidade/balanco · /contabilidade/dre-studio · /contabilidade/dre-studio/modelos · /contabilidade/dre-studio/modelos/novo
- `Faturamento` (Receipt): /auditoria-apontamento-genius · /faturamento-genius
- `BI e Analytics` (BarChart3): /bi/contabilidade/dre · /bi/faturamento-validacao · /bi/comercial · /bi/comercial/metas · /bi/faturamento/relatorio-executivo · /etl
- `Cadastros` (Boxes): /cadastros/produtos
- `Regras Senior` (ShieldAlert): /regras-senior · /regras-senior/regras · /regras-senior/identificadores · /regras-senior/auditoria · /regras-senior/snapshots
- `Relatórios` (FileText): /relatorios/desenvolvimento · /relatorios/publicados · /relatorios/execucoes
- `Operacional` (Cog): /passagens-aereas · /frota · /manutencao-maquinas

**HCM (flat, ícone Users):** /rh · /rh/resumo-folha · /rh/quadro-colaboradores · /rh/contrato-experiencia · /rh/programacao-ferias · /rh/turnover · /rh/absenteismo · /rh/formularios · /rh/relatorio-gerencial

**Configurações (flat, ícone Settings):** /monitor-usuarios-senior · /gestao-sgu-usuarios · /configuracoes · /biblioteca-bi

Rotas existentes que **não constam** na lista do usuário (`/monitor-telas`, `/bi/financeiro/dre-configuravel`, `/bi/contabilidade/dre-dinamica`, `/bi/contabilidade/dre-dinamica/montador`, `/bi/contabilidade/dre/excecoes`, `/bi/contabilidade/dre/aprovacoes`, `/bi/contabilidade/dre/parametrizacao`, `/bi/contabilidade/dre/configuracao`, `/bi/contabilidade/dre/sincronizacao-depara`, `/contabilidade/dre-studio/configuracoes`, etc.) ficam **ocultas do menu**, mas as rotas continuam registradas — usuário acessa por link direto/favorito. Nenhuma URL é alterada.

### 3. Comportamento accordion

- `openTop: string | null` (estado único de topo aberto). Igual ao `openGroup` atual, mas agora reflete apenas Favoritos/Início/ERP/HCM/Configurações — abrir um fecha os demais.
- Dentro de ERP: `openSubs: Record<string, boolean>` (map por id de subgrupo) — múltiplos podem estar abertos simultaneamente. Ao trocar de rota, expande automaticamente o subgrupo ativo sem fechar outros já abertos pelo usuário.
- Ao mudar `location.pathname`, calcular `activeTopId` + `activeSubId` (busca pelo prefixo mais longo entre todas as leaves) e:
  - Setar `openTop = activeTopId` (força a abertura do topo correto).
  - Setar `openSubs[activeSubId] = true` (sem desmarcar os já abertos).

### 4. Página ativa

Item leaf ativo já usa a classe `bg-primary/15 text-primary` + faixa vertical `before:` (código atual). Manter e reforçar contraste em ambos os temas (nenhuma cor hardcoded — só tokens semânticos).

### 5. Busca

`Input` "Buscar menu…" já existe. Ajustar `filter` para operar recursivamente sobre a nova árvore:
- Enquanto `q.trim()` não vazio: força `openTop` = todos os que têm match e `openSubs[*] = true` para os subgrupos com match (`forceOpen` já existe — replicar para o nível 2 e para o nível 3 dentro de ERP).
- Ao clicar em resultado da busca: efeito colateral do `NavLink` já muda a rota → o `useEffect` de expansão automática garante que topo+subgrupo permaneçam abertos após limpar a busca.

### 6. Mobile — fechar ao selecionar

- Ler `isMobile` de `useSidebar()` (já disponível via `useIsMobile`) e chamar `setOpenMobile(false)` no `onClick` de cada `NavLink`. Não afeta desktop.

### 7. Permissões

Manter `useUserPermissions` + `isVisible(url)` já existentes. Filtragem recursiva:
- Se um subgrupo fica sem items visíveis → esconde o subgrupo.
- Se um topo (ERP/HCM/Configurações) fica sem nenhum subgrupo/item visível → esconde o topo inteiro.
- Nada de exibir números como "6/18". O código atual não mostra contadores; garantir que a nova versão também não introduza.

### 8. Visual

- Manter tokens `sidebar-*` (azul corporativo) e classes existentes de hover/active.
- Ícones coerentes: topos usam ícones únicos (Home / Package / Users / Settings / Star); subgrupos de ERP mantêm ícones já usados hoje (Factory, ShoppingCart, Warehouse, Landmark, Receipt, BarChart3, Boxes, ShieldAlert, FileText, Cog).
- Chevron rotacionando (já existe) em todos os níveis; sub-nível de ERP usa indent extra com border-l suave (padrão atual).
- Animações discretas de expandir/recolher: manter `Collapsible` do Radix (transição 200ms padrão do design system).

### 9. Fora de escopo

- Nenhuma alteração em rotas (`src/App.tsx`), páginas, permissões, brand ou tema.
- Nenhuma migração no backend.
- `useFavorites` continua igual — o "Favoritos" é o primeiro topo accordion (mesmo componente atual `renderFavoritesGroup`).

Arquivo alterado: `src/components/AppSidebar.tsx` (rewrite completo do array de dados + funções de renderização recursiva). Nada mais é tocado.
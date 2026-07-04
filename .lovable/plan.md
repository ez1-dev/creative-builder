# Reorganização do Menu Lateral

Reestruturar `src/components/AppSidebar.tsx` em 10 grupos de negócio com accordion controlado (apenas um aberto por vez), busca no topo e área de favoritos. Nenhuma rota nova é criada — apenas reorganização visual + dois recursos novos (busca, favoritos).

## Nova árvore do menu

1. **Início** — Dashboard Geral (`/`), Relatório Executivo Faturamento (`/bi/faturamento/relatorio-executivo`), Favoritos (dinâmico)
2. **Cadastros** — Produtos (`/cadastros/produtos`)
3. **Produção** (com sub-accordions)
   - Visão Geral: Dashboard, Produção no Período, Saldo em Pátio, Lead Time
   - Planejamento: Carga de Produção, Sequenciamento, Dashboard de Carga, Carga por Recurso
   - Obras e Expedição: Expedição para Obra, Semanal por Obra, Itens Não Carregados
   - Engenharia / OP: Engenharia x Produção, Impressão de OP
4. **Comercial / Faturamento** — BI Comercial, Metas de Faturamento, Validação Faturamento
5. **Controladoria** (sub-accordion DRE)
   - DRE: Contabilidade — DRE, DRE Configurável, DRE Dinâmica, Montador DRE, Exceções DRE, Aprovações DRE, Parametrização DRE, Configurações DRE, De/Para DRE
6. **BI e Dados** — Biblioteca BI, Central ETL
7. **RH** — Resumo Folha, Quadro Colaboradores, Contratos de Experiência, Férias, Formulários
8. **Regras Senior** — Dashboard, Regras LSP, Identificadores, Auditoria, Snapshots
9. **Relatórios** — Criador de Relatórios, Relatórios Publicados, Histórico
10. **Administração** — Monitor Usuários Senior, Gestão SGU, Configurações

Rótulos curtos serão usados para evitar reticências (ex.: "DRE Configurável", "Metas Faturamento", "Semanal Obra", "Não Carregados", "Contratos Exp.").

## Regras de UX

- **Accordion exclusivo**: estado controlado — abrir um grupo fecha os demais. Grupo ativo (que contém a rota atual) abre automaticamente na montagem.
- **Sub-accordions** dentro de Produção e Controladoria seguem a mesma regra dentro do grupo pai.
- **Item ativo**: fundo `bg-sidebar-accent` já existe; aumentar contraste usando token azul mais claro (`bg-primary/15 text-primary`) via `activeClassName`.
- **Busca**: input no topo do `SidebarContent` filtra itens por título (case-insensitive). Quando há termo, todos os grupos com matches expandem e itens sem match ficam ocultos.
- **Favoritos**: estrela ao lado de cada item; clique adiciona/remove. Persistido em `localStorage` (`sidebar:favorites`). Aparece como sub-lista dentro de "Início".
- **Colapsado (icon mode)**: mantém apenas ícones de grupo (sem busca/favoritos), comportamento atual preservado.

## Órfãos e itens legados

Itens hoje visíveis que **não aparecem na nova árvore** serão movidos para um grupo colapsado "**Outros (legado)**" no final da sidebar, para não perder acesso sem quebrar quem já usa:
- Consulta de Estoques, Estoque Min/Max, Sugestão Min/Max, Onde Usa, Estrutura Multinível, Compras/Custos, Painel de Compras, Demonstrativo Compras/Receb., Auditoria Tributária, Auditoria Apont. Genius, Faturamento Genius, Conciliação EDocs, NF Receb., Reserva Nº Série, Contas a Pagar, Contas a Receber, Balanço, Passagens Aéreas, Manutenção de Frota, Manutenção de Máquinas.

Se preferir esconder de vez, avise que removo o grupo "Outros" no build.

## Detalhes técnicos

- Arquivo único alterado: `src/components/AppSidebar.tsx`.
- Substituir os múltiplos `<Collapsible defaultOpen>` independentes por um único estado `openGroup: string | null` gerenciado no componente. Cada `Collapsible` vira controlado (`open`/`onOpenChange`) — abrir um seta `openGroup` para seu id e fecha os demais.
- Inicialização: derivar `openGroup` da rota atual (mesma lógica dos flags `isXxxActive` de hoje).
- Sub-grupos de Produção/Controladoria: segundo estado `openSubGroup` escopado ao grupo pai.
- Busca: `useState('')` + filtro aplicado sobre a árvore antes de render. Sem debounce (lista pequena).
- Favoritos: hook `useFavorites()` novo em `src/hooks/useFavorites.ts` com `get/toggle/isFavorite` sobre `localStorage`. Estrela é `lucide-react` `Star` / `StarOff`.
- Permissões: manter `isVisible(url)` do `useUserPermissions` em todos os itens (inclusive favoritos — favorito sem permissão não renderiza).
- Sem mudanças em rotas (`src/App.tsx`), páginas, backend ou dados.

## Fora de escopo

- Não criar novas telas (Dashboard Geral usa a rota `/` atual; se quiser uma home dedicada, é outra tarefa).
- Não mexer em `AppLayout`, header, permissões ou catálogo de telas.

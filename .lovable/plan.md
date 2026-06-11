## Objetivo
Tornar a página `/configuracoes` mais profissional como um todo — hoje há 13 abas espremidas numa única `TabsList` horizontal, sem hierarquia, sem busca e com superfícies inconsistentes entre as abas. Vamos manter o trabalho já feito nas 3 abas de acesso e elevar o restante ao mesmo padrão.

## Escopo (somente UI/UX, sem mudar lógica nem backend)

### 1. Shell da página
- Substituir a `TabsList` horizontal por uma **navegação lateral agrupada** (sidebar à esquerda em desktop, `Sheet` em mobile), com seções:
  - **Acessos** — Perfis de Acesso, Permissões por Tela, Usuários, Aprovações
  - **Plataforma** — API, Gráficos e Mapas, Versão, Documentação
  - **Operação** — Logs, Monitoramento, Dashboard de Uso
  - **Pessoal** — Minhas Preferências
- Cada item lateral com ícone, label e *badge* (pendências de aprovação, logs 24h).
- Busca rápida no topo da sidebar (`Filtrar configurações…`) que filtra os itens por nome.
- `PageHeader` reformatado: título + descrição + barra de ações à direita (atalhos contextuais por aba, ex.: "Novo perfil", "Atribuir acesso", "Recarregar").
- Breadcrumb leve: `Configurações › <Seção> › <Aba>`.

### 2. Padronização visual das abas
Aplicar o mesmo padrão já usado em Perfis/Permissões/Usuários nas demais:
- Faixa de KPIs no topo (quando faz sentido: Aprovações, API, Logs, Monitoramento, Dashboard de Uso).
- Toolbar com busca + filtros + ordenação.
- Conteúdo dentro de `Card` com cabeçalho, divisores sutis e *empty states* padronizados (ícone + título + descrição + CTA).
- Inputs `h-9`, badges semânticos, espaçamento uniforme.

### 3. Refinamentos específicos por aba (apenas apresentação)
- **Aprovações:** KPIs (Pendentes, Aprovados 7d, Rejeitados 7d), busca por login/nome, filtro por status, ações em lote (aprovar/rejeitar selecionados) — sem mexer nos handlers existentes.
- **API:** Cartões de status de conexão (FastAPI, ngrok), badge de latência, botão "Testar conexão" em destaque, agrupar campos em seções (Conexão, Cabeçalhos, Diagnóstico).
- **Logs:** Toolbar com busca, filtro por severidade/origem, range de datas; linha do tempo + tabela com `ScrollArea` e empty state.
- **Monitoramento / Dashboard de Uso:** Manter os componentes atuais, apenas envolver em `Card` com cabeçalho consistente e respiro.
- **Gráficos e Mapas:** Cabeçalho de seção, prévia visual de cada tema/mapa em grid.
- **Versão / Documentação / Minhas Preferências:** Cabeçalho consistente, conteúdo dentro de `Card`, tipografia alinhada.

### 4. Detalhes de qualidade
- Somente tokens do design system (`bg-card`, `border`, `muted-foreground`, `primary`, `accent`) — sem cores hardcoded.
- Skeletons leves nos blocos enquanto carregam.
- Persistir a aba ativa em `?tab=` na URL (já existe `activeTab`, só plugar `searchParams`).
- Acessibilidade: `aria-current` na sidebar, foco visível, ordem de tabulação.

## Fora de escopo
- Schemas, RPCs, edge functions, lógica de permissões, `ALL_SCREENS`.
- Mudanças nas regras de aprovação, autenticação, integração com FastAPI.
- Refatoração das abas Perfis/Permissões/Usuários já entregues (só herdam o novo shell).

## Arquivos a editar
- `src/pages/ConfiguracoesPage.tsx` (shell + toolbar + atalhos + integração com sidebar).
- Novo: `src/components/configuracoes/ConfiguracoesSidebar.tsx` (navegação agrupada com busca e badges).
- Polimento leve nos painéis existentes referenciados pelas abas (API, Logs, Aprovações, etc.) — apenas wrappers de `Card`/header, sem tocar em lógica.

## Resultado esperado
Página com navegação lateral limpa, hierarquia clara entre seções, toolbar e KPIs consistentes em todas as abas, e visual coeso com o restante do ERP.
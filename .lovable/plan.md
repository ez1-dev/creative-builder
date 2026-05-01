## Diagnóstico

A página `/passagens-aereas/compartilhado` (`src/pages/PassagensAereasCompartilhadoPage.tsx`) já reaproveita o `PassagensDashboard`, que tem responsividade parcial (`useIsMobile` para gráficos, `isCompact <1024px` para tabela/KPI Registros). Pontos que ainda quebram em telas pequenas:

1. **Header da página compartilhada** — `px-4 py-3` fixo, título "Passagens Aéreas" em `text-lg` ocupa muito espaço em telefones; subtítulo `linkName · Visualização compartilhada` não trunca e estoura horizontalmente em links com nome longo.
2. **Container `max-w-7xl mx-auto p-4`** — padding lateral em mobile fica grande, comendo espaço útil dos cards.
3. **Footer** — texto pequeno mas fixo, ok em mobile, sem ajuste necessário.
4. **Gráfico "Por Motivo de Viagem"** — em mobile o `outerRadius=70` + container `360px` somado à legenda abaixo cabem, mas no breakpoint tablet (768–1023px) ele cai no caminho desktop com `outerRadius=78` e labels externos que voltam a estourar (largura do card lá é ~360px, similar ao mobile).
5. **Gráfico "Top Centros de Custo"** — `width={isMobile ? 90 : 140}` para o eixo Y; no tablet usa 140px o que comprime as barras.
6. **KPIs (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)** — ok, mas o cartão "Registros" com Select de agrupamento embutido encavala em 360–400px (botão de toggle layout + select competem pelo espaço). O `isCompact` já trata, mas vale revalidar.
7. **Filtros** — `grid-cols-1 md:grid-cols-3 lg:grid-cols-7`; em tablet (md, ≥768px) força 3 colunas com 7 filtros = 3 linhas, ok. Em mobile estão 1 por linha, ok.
8. **Mapa de Destinos** (`MapaDestinosCard`) — verificar se tem altura responsiva. Provavelmente fixa.
9. **Tabela "Registros"** — `isCompact` vira cards abaixo de 1024px, ok. Header da tabela com Search + Select ordenação + botões Agrupar/CSV/Excel já usa `flex-wrap` + `flex-1 sm:flex-none`, ok.

## Solução

Foco: telefones (≤480px), tablets retrato (≤768px), tablets paisagem (≤1024px). Sem alterar comportamento desktop.

### `src/pages/PassagensAereasCompartilhadoPage.tsx`
- Header: padding adaptativo `px-3 sm:px-4`, título `text-base sm:text-lg`, ícone menor em mobile (`h-5 w-5 sm:h-6 sm:w-6`).
- Subtítulo com `truncate` para evitar overflow horizontal em mobile (links com nome longo).
- Main: `p-2 sm:p-4` para ganhar área útil em mobile.
- Tela de senha: já é `max-w-md`, manter.

### `src/components/passagens/PassagensDashboard.tsx` — ajustes responsivos no dashboard (afeta as duas rotas)

1. **Pie "Por Motivo de Viagem"**: tratar tablet retrato (768–1023px) igual ao mobile — usar a versão "porcentagem dentro da fatia + legenda colorida abaixo", já implementada para mobile. Para isso, criar `isPieCompact = window.innerWidth < 1024` específico do gráfico (ou reutilizar `isCompact`) e aplicar mesma lógica de label/legenda. Evita o corte que voltou a aparecer em telas estreitas.

2. **Bar "Top Centros de Custo"**: ajustar `width` do eixo Y para 3 níveis — `isMobile ? 90 : isCompact ? 110 : 140` — ganhando barras maiores em tablet retrato.

3. **KPI "Registros" com Select de agrupamento**: garantir que no mobile (`isCompact`) o Select ocupe largura total e o botão extra fique abaixo (já existe um caminho `isCompact` em ~linha 695-732, validar que está sendo usado em todos os tamanhos `<1024px`).

4. **Mapa de Destinos**: passar prop ou ajustar internamente para altura `h-[260px] sm:h-[320px] lg:h-[380px]`, evitando mapa minúsculo em desktop e gigante em mobile.

5. **Header da tabela "Registros"**: adicionar `min-w-0` nos filhos flex para permitir truncamento de labels em viewports muito estreitos (320px).

6. **Padding interno dos `Card`**: trocar `<CardContent>` default (que usa `p-6`) por `p-3 sm:p-6` apenas nos cards de gráfico do dashboard, ganhando espaço em mobile.

7. **Filtros (FilterPanel)**: o grid `md:grid-cols-3` em tablet retrato (768px) com Comboboxes pode estourar — adicionar `min-w-0` em cada wrapper de campo.

### Validação visual

Após implementar, abrir em três viewports via browser tools:
- 375x812 (iPhone)
- 768x1024 (iPad retrato)
- 1024x768 (iPad paisagem)

Capturar screenshots de cada e ajustar fino se algum overflow horizontal sobrar.

## Fora do escopo

- Não alterar lógica de filtros, cliques nos gráficos, exportação, drag-drop de layout.
- Não mudar autenticação por senha do link compartilhado.
- Não mexer em desktop ≥1024px.
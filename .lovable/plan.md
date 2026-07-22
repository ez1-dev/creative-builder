
## Contexto verificado

- `src/components/dre-studio/DreFilters.tsx` **não** possui atualmente um filtro "Unidade de Negócio" na barra superior — nada precisa ser removido da UI de filtros. O que existe é o parâmetro `unidade` opcional em `dreMatrizApi.ts` (linhas 54 e 126), mas ele **não** é setado pela `DrePadraoPage`/`DreStudioVisualizacaoPage`, ou seja, a matriz já é chamada sem `unidade_negocio`.
- O drill "Unidade de Negócio" já existe: `DrillsMenu.tsx` reconhece a dimensão, `drillDreApi.ts` a expõe como `unidade_negocio`, e `DrillResultadoPanel.tsx` renderiza colunas dirigidas pelo backend via `/api/contabil/drill-dre`. Não há hoje UI específica para Genius/Estrutural/Não classificado nem indicador de qualidade.
- `DrePadraoPage.tsx` renderiza `DreStudioVisualizacaoPage` em modo bloqueado e não exibe hoje badge de "Visão consolidada" nem aviso temporário.

Portanto, o trabalho é essencialmente: (1) reforçar garantias na chamada da matriz, (2) melhorar UX do cabeçalho da DRE Padrão, (3) enriquecer o painel de drill quando a dimensão for `unidade_negocio` — tudo respeitando a regra "o frontend nunca classifica".

## Escopo

### 1. Matriz consolidada — reforçar contrato
- Em `DreStudioVisualizacaoPage.tsx`, quando `modoBloqueado` (DRE Padrão), garantir que `unidade`/`unidade_negocio` **nunca** é enviado ao endpoint da matriz. Nenhum filtro superior de Unidade de Negócio é adicionado.
- Preparar leitura de `response.meta?.suporta_filtro_unidade` do payload da matriz (sem ativar UI). Guardar em estado local; enquanto `false/undefined`, nada é renderizado.
- Se o backend responder com `unidade_filtro_ignorado: true`, ignorar silenciosamente (sem toast).

### 2. Cabeçalho "Visão consolidada" em `DrePadraoPage.tsx`
- Adicionar badge discreto ao lado do título "DRE Padrão":
  - Texto: `Visão consolidada`
  - Tooltip: "A matriz principal apresenta os valores consolidados. A análise por Unidade de Negócio está disponível nos drills das linhas."
- Renderizar apenas quando `suportaFiltroUnidade !== true` (padrão hoje).

### 3. Aviso temporário recolhível
- Em `DrePadraoPage.tsx`, abaixo do header e acima da visualização, um alerta discreto (variant `default`/info) recolhível, persistindo estado em `localStorage` (`dre-padrao:aviso-unidade`):
  - "A análise por Unidade de Negócio está disponível nos drills. O filtro da matriz será habilitado após a conclusão da materialização contábil por centro de custo."
- Só aparece quando `suportaFiltroUnidade !== true`.

### 4. Drill "Unidade de Negócio" enriquecido
Em `src/components/dre-studio/DrillResultadoPanel.tsx`, ao detectar `ctx.agrupar_por === 'unidade_negocio'`:
- Mapear apresentação apenas (sem classificar):
  ```ts
  const UN_LABELS = {
    GENIUS: 'Genius',
    ESTRUTURAL: 'Estrutural Zortea',
    NAO_CLASSIFICADO: 'Não classificado',
  };
  ```
  Aplicar no label da coluna `codigo`/`chave`/`unidade` conforme os campos que o backend devolver (usar o primeiro campo disponível entre `unidade_negocio`, `codigo`, `chave`).
- Ordenar rows: `ESTRUTURAL` → `GENIUS` → `NAO_CLASSIFICADO`; demais categorias após, por maior valor.
- Nunca ocultar/redistribuir `NAO_CLASSIFICADO`. Marcar visualmente com badge âmbar sutil + tooltip: "Lançamentos cujo centro de custo não possui identificação G- ou E- na descrição.".
- Acima da tabela, exibir bloco "Qualidade da classificação":
  - `Classificado: X%` (soma dos percentuais de GENIUS + ESTRUTURAL, quando o backend enviar `percentual`).
  - `Não classificado: Y%`.
  - Se algum dos itens não tiver `percentual`, calcular a partir de `valor` sobre o total do payload — apenas para indicador visual.
- Conferência de total: comparar `sum(valor)` com `ctx.totalLinhaDre` (tolerância `0.01`). Se divergir, mostrar aviso discreto: "A classificação por unidade não fecha com o total da linha." — nunca corrigir.
- Nada disso altera as demais dimensões.

### 5. Exportação do drill (CSV/XLSX) para dimensão `unidade_negocio`
- Cabeçalho customizado no XLSX quando `agrupar_por === 'unidade_negocio'`:
  - "DRE Padrão — Análise por Unidade de Negócio"
  - Modelo, Linha analisada, Período, Empresa, Filial (a partir de `ctx.filtros` e `ctx.linhaDescricao`/`modeloId`).
- Colunas: Unidade de Negócio (com label amigável), Valor, Percentual, Quantidade de lançamentos. Incluir a linha "Não classificado".

### 6. Restrições explícitas (não fazer)
- Não filtrar `linhas` da matriz por unidade no frontend.
- Não usar `descricaoCentroCusto.startsWith('G-'/'E-')` em lugar algum.
- Não usar códigos `502`/`503`/`cd_centro_custos_3` do BI Comercial nesta trilha.
- Não ativar filtro superior via constante — só via `meta.suporta_filtro_unidade`.
- Não navegar do drill de Unidade para Razão filtrando localmente por descrição de CCU. Se o backend não expuser filtro `unidade_negocio` no `drill-lancamentos`, manter o item apenas como análise agregada (sem clique-para-Razão). Verificação em runtime: se `linha.drills` do próximo nível não trouxer `lancamento` com suporte, permanecer no nível agregado.

## Arquivos a alterar

- `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx` — badge "Visão consolidada" + aviso recolhível.
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — nunca enviar `unidade` na matriz quando `modoBloqueado`; capturar `meta.suporta_filtro_unidade` (leitura apenas) e propagar para `DrePadraoPage` via callback ou hook local.
- `src/components/dre-studio/DrillResultadoPanel.tsx` — labels amigáveis, ordenação, badge de "Não classificado", indicador de qualidade, conferência de total, cabeçalho de exportação específico para `unidade_negocio`.
- (Opcional) `src/lib/contabil/dreMatrizApi.ts` — expor `meta.suporta_filtro_unidade` no tipo de resposta se ainda não estiver mapeado.

## Detalhes técnicos

- Mapa `UN_LABELS` fica **apenas** dentro do `DrillResultadoPanel` (uso de apresentação). Nenhum outro componente conhece esses códigos.
- Detecção do código canônico: usar `row.unidade_negocio ?? row.codigo ?? row.chave` como chave do mapa (uppercase, trim). Se não bater, exibir o valor original sem transformar.
- Tolerância de conferência: `Math.abs(soma - totalLinhaDre) <= 0.01`.
- Aviso recolhível: `useState` inicializado por `localStorage.getItem('dre-padrao:aviso-unidade')`; ao fechar, grava `'closed'`. Persiste entre sessões, não bloqueia página.
- Flag `suportaFiltroUnidade` é somente-leitura no momento; qualquer render de UI de filtro fica atrás de `{suportaFiltroUnidade && ...}` — hoje sempre falso.

## Critérios de aceite

- Nenhum request para `/api/contabil/dre/matriz` inclui `unidade`/`unidade_negocio` na DRE Padrão.
- Badge "Visão consolidada" e aviso recolhível visíveis em `/contabilidade/dre-padrao`.
- Drill "Unidade de Negócio" mostra Genius / Estrutural Zortea / Não classificado com nomes amigáveis, ordenação estável e "Não classificado" sempre visível.
- Indicador de qualidade calculado só a partir dos valores devolvidos pelo backend.
- Divergência de total exibida como aviso, nunca corrigida.
- Exportação XLSX/CSV do drill inclui as três categorias e cabeçalho contextual.
- Nenhum lugar do frontend classifica CCU por prefixo `G-`/`E-` nem usa `502`/`503`.
- Filtro superior de Unidade de Negócio permanece **ausente** e só surgirá quando `meta.suporta_filtro_unidade === true` for entregue pelo backend.

## Objetivo

Adicionar uma nova aba **“OPs Pintura/Jato”** dentro da tela `Auditoria Apontamento Genius`, consumindo o endpoint `GET /api/auditoria-apontamento-genius/ops-jato-peso` e o detalhe `…/{origem}/{numero_op}/componentes`. A aba lista OPs Genius que passaram por JATO/Pintura (operações 2160/2161 já filtradas no backend), com filtros, KPIs, tabela paginada server-side, badge de status de peso, modal de explosão multinível e exportação Excel.

A aba atual (auditoria de apontamentos) vira a aba **“Apontamentos”**, sem mudança de comportamento. Mesmo padrão visual (PageHeader, FilterPanel, KpiGroup, DataTable, PaginationControl, ExportButton, Sheet).

## Estrutura

```text
/auditoria-apontamento-genius
└─ <Tabs>
   ├─ Apontamentos          (conteúdo atual, intacto)
   └─ OPs Pintura/Jato      (novo)
```

Wrap do conteúdo atual em `<Tabs defaultValue="apontamentos">` dentro de `AuditoriaApontamentoGeniusPage.tsx`. Cada aba mantém seu próprio estado (filtros, paginação, dados) — sem compartilhamento.

## Novos arquivos

- `src/pages/auditoria-genius/OpsJatoPesoTab.tsx` — componente da aba.
- `src/pages/auditoria-genius/OpsJatoComponentesSheet.tsx` — drawer de explosão multinível.
- `src/lib/api.ts` — adicionar:
  - `getOpsJatoPeso(params)` → chama `/api/auditoria-apontamento-genius/ops-jato-peso`.
  - `getOpsJatoPesoComponentes(origem, numero_op)` → chama o endpoint de componentes.
  - `exportOpsJatoPeso(params)` → mesma rota com `exportar_excel=true` (download).
  - Tipos `OpJatoPesoItem`, `OpJatoPesoResponse`, `OpJatoComponente`, `OpJatoComponentesResponse`.

## Filtros (topo da aba)

`FilterPanel` com:

- **Empresa** (`codemp`) — `Input` (default vazio = todas).
- **Data Inicial** / **Data Final** (`data_ini`, `data_fim`) — date inputs (default: mês corrente).
- **Origem** (`origem`) — `Input`.
- **Número OP** (`numero_op`) — `Input`.
- **Código Produto** (`codigo_produto`) — `Input`.
- **Situação OP** (`situacao_op`) — `Select` (E, L, A, F, C, vazio=todas).
- **Status Peso** — `Select` que mapeia para os 3 flags exclusivos: `somente_com_peso`, `somente_sem_peso`, `somente_peso_parcial` (apenas um ativo por vez; "Todos" = nenhum).
- `usar_multinivel=true` enviado fixo.
- Botões Aplicar / Limpar / Exportar Excel.

## KPIs (KpiGroup)

Cards consumindo bloco `resumo` da resposta:

1. **Total de OPs** — `total_ops`
2. **Peso Total KG Multinível** — `peso_total_kg_multinivel` (formatado pt-BR, 2 casas)
3. **OPs com Peso** — `ops_com_peso`
4. **OPs sem Peso** — `ops_sem_peso`
5. **OPs com Peso Parcial** — `ops_peso_parcial`
6. **OPs com Ciclo BOM** — `ops_ciclo_bom`
7. **OPs sem Componentes** — `ops_sem_componentes`

## Tabela (DataTable + PaginationControl)

Colunas (na ordem):

| Coluna | Campo |
|---|---|
| Origem | `origem` |
| Número OP | `numero_op` |
| Código Produto | `codigo_produto` |
| Descrição Produto | `descricao_produto` |
| Situação OP | `situacao_op` (badge) |
| Data Jato | `data_jato` (formatDate) |
| Qtd. Apontamentos Jato | `qtd_apontamentos_jato` |
| Qtd. Componentes Diretos | `qtd_componentes_diretos` |
| Qtd. Componentes Finais | `qtd_componentes_finais` |
| Qtd. Componentes Expandidos | `qtd_componentes_expandidos` |
| Nível Máximo | `nivel_maximo` |
| Peso KG Direto | `peso_kg_direto` (texto auxiliar muted) |
| Peso KG Multinível | `peso_kg_multinivel` (negrito, destaque) |
| Status Peso | `status_peso` (Badge colorido) |
| Ações | botão **Ver Componentes** |

Peso principal = `peso_kg_multinivel`. `peso_kg_direto` mostrado em estilo `text-muted-foreground` para auditoria.

## Badge `status_peso`

Helper `statusPesoVariant(status)`:

- `OK` → verde (`bg-green-100 text-green-800`)
- `PESO_ZERO` → vermelho
- `PESO_PARCIAL` → amarelo
- `SEM_COMPONENTES_E900CMO` → cinza
- `PRODUZIDO_SEM_MODELO` → laranja
- `CICLO_BOM` → vermelho/roxo (`bg-purple-100 text-red-700 border-red-300`)
- `SEM_CONVERSAO_UNIDADE` → laranja

Tons via classes Tailwind; respeitar tokens semânticos onde possível (sucesso, alerta, destrutivo) e complementar com cores dedicadas só onde o design system não tem equivalente.

## Paginação

`PaginationControl` server-side. Selector adicional `tamanho_pagina` com opções **50, 100, 200, 500** (default 100). Mudança de tamanho reseta para `pagina=1`.

## Exportar Excel

Botão `ExportButton` na barra de filtros. Dispara `exportOpsJatoPeso({...filtrosAtuais, exportar_excel: true})` que faz `fetch` com `responseType: blob`, salva como `ops-jato-peso_YYYYMMDD.xlsx`.

## Drawer “Ver Componentes”

`Sheet` (lateral, `side="right"`, `w-[1100px]`) abre ao clicar **Ver Componentes** numa linha:

- Header: `Origem · OP {numero_op} — {descricao_produto}` + KPIs rápidos (peso multinível, qtd componentes finais, nível máximo).
- Loading state enquanto busca componentes.
- DataTable com colunas:
  - Nível, Código Pai, Código Componente, Descrição Componente, Derivação, Origem Componente, Tipo Produto, Quantidade Nível, Quantidade Acumulada, Unidade, Peso Unitário, Peso Calculado, Foi Expandido (badge sim/não), Componente Final (badge), Ciclo Detectado (badge vermelho se true), Caminho.
- Indentação visual por `nivel` na coluna “Código Componente” (`paddingLeft: nivel * 12`).
- Sem cálculo no frontend — todos pesos vêm da API.

## Detalhes técnicos

- **Estado**: `useState` para filtros; `useState` para `pagina`, `tamanhoPagina`; `useQuery`-style via `useEffect` + `useState` (mesmo padrão já usado nas outras abas/páginas — ex.: `AuditoriaApontamentoGeniusPage`).
- **Reaplicação**: aba só carrega quando montada (`activeTab === 'jato'`); não pré-busca.
- **AI Page Context**: registrar contexto da nova aba via `useAiPageContext` com summary + sample dos primeiros itens, mesma convenção da aba atual.
- **Erros**: `try/catch` com `toast.error` e `logError`.
- **ErpConnectionAlert**: reaproveitar guard já presente na página.
- **Sem tokens hardcoded** fora dos badges de status (cores semânticas exigidas pelo requisito).

## Out of scope

- Cálculo de peso no frontend.
- Mudanças no contrato/comportamento da aba “Apontamentos” existente.
- Permissões (rota já existe; nova aba herda permissão da tela).
- Documento backend (`docs/backend-*`) — não solicitado; backend já entrega o endpoint.

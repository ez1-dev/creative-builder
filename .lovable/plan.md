
## Objetivo

Permitir que **qualquer componente** da Biblioteca BI (KPIs, gráficos, mapas, árvores, tabelas) seja aplicado em **qualquer página** do sistema, não apenas nas 7 páginas hoje cadastradas em `pageRegistry.ts`.

## Diagnóstico

Hoje o `ApplyComponentDialog` filtra `compatiblePages = PAGE_REGISTRY.filter(...)`. Páginas não listadas (ex.: `Estoque`, `Conciliação EDocs`, `BOM`, `Onde Usa`, `Engenharia Produção`, `Sugestão Min/Max`, `Auditoria Tributária`, `Contas Receber`, `Compras / Custos do Produto`, `Número de Série`, e as sub-páginas de Produção) simplesmente não aparecem como destino. Além disso, mesmo as páginas listadas só aceitam widgets que casem com o `schema` declarado.

## Plano

### 1. Catálogo único de páginas alvo

Em vez de manter um `PAGE_REGISTRY` curto + um `screenCatalog.ts` separado, gerar a lista de páginas alvo a partir de uma fonte única:

- Manter as 7 entradas atuais com schema rico (continuam suportando auto-mapeamento de campos conhecidos).
- Adicionar entradas **genéricas** para todas as demais páginas listadas em `src/pages/` (incluindo `producao/*`).
- Cada entrada genérica declara as 3 seções padrão (`kpis`, `charts`, `tables`) aceitando todos os `WidgetKind`, e schema vazio (mapeamento manual / livre).

### 2. Schema livre quando a página não publica dados

No `ApplyComponentDialog`, quando o `page.schema` estiver vazio:
- Permitir **digitar livremente** o nome do campo (input texto em vez de Select), pois o usuário pode passar qualquer chave que a página vier a publicar no futuro.
- Mostrar aviso "esta página ainda não publica dados; o widget será renderizado em branco até que dados sejam expostos via `PageDataProvider`".

### 3. `<PageDataProvider>` + `<UserWidgetsSlot>` em todas as páginas

Adicionar a infraestrutura mínima em cada página que ainda não tem:

- `EstoquePage`, `ConciliacaoEdocsPage`, `BomPage`, `OndeUsaPage`, `EngenhariaProducaoPage`, `SugestaoMinMaxPage`, `AuditoriaTributariaPage`, `ContasReceberPage`, `ComprasProdutoPage`, `NumeroSeriePage`, `DemonstrativoComprasRecebimentosPage`, `AuditoriaApontamentoGeniusPage`.
- Sub-páginas de produção: `ExpedidoObraPage`, `LeadTimeProducaoPage`, `NaoCarregadosPage`, `ProduzidoPeriodoPage`, `RelatorioSemanalObraPage`, `SaldoPatioPage`.

Cada página recebe:
```tsx
<PageDataProvider value={{ pageKey: '<key>', kpis, series, rows }}>
  ...conteúdo...
  <UserWidgetsSlot section="kpis"  cols={4} />
  <UserWidgetsSlot section="charts" cols={3} />
  <UserWidgetsSlot section="tables" cols={2} />
</PageDataProvider>
```

Quando a página não tiver `kpis`/`series` óbvios, passa `{}` mesmo — o widget renderiza vazio mas o slot existe.

### 4. Compatibilidade

- Páginas já registradas mantêm schemas atuais (auto-map continua funcionando).
- Filtro `compatiblePages` no diálogo deixa de filtrar — todas as páginas aparecem.
- Permissões por tela (`profile_screens`) continuam controlando quem vê o quê.

## Arquivos afetados

- `src/lib/bi/pageRegistry.ts` — adicionar entradas genéricas para ~18 páginas.
- `src/components/bi/runtime/ApplyComponentDialog.tsx` — input livre quando schema vazio; remover filtro de compatibilidade restrito.
- `src/pages/*` (~12 páginas) e `src/pages/producao/*` (~6 páginas) — adicionar `PageDataProvider` + 3 `UserWidgetsSlot`.

## Resultado esperado

No `/biblioteca-bi`, ao clicar em "Aplicar este componente" em **qualquer** card, o seletor de página mostra **todas** as telas do sistema. Após salvar, o widget aparece na página escolhida (com dados reais quando a página publicar via `PageDataProvider`, ou em branco aguardando mapeamento manual/dados futuros).

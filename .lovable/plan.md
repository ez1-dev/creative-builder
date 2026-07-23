
# Drill-down contábil (indicadores → razão + rollup reverso)

Implementar a cadeia de navegação **Indicador → Aglutinador(es) → sub-aglutinadores/contas → Razão (lançamento) → Documento**, e o caminho reverso ("Onde este número entra?") a partir de qualquer conta.

## 1. Camada de API (novo arquivo `src/lib/contabil/drillAglutinadorApi.ts`)

Cliente do backend com dois endpoints:

- `GET /api/contabil/aglutinadores/{codagl}/drill` → `{ codagl, descricao, base, total, componentes[] }`
  - Cada `componente`: `{ tipo: 'aglutinador' | 'conta', operador: '+'|'-', codagl?, ctared?, clacta?, descricao, valor, drill: { tipo: 'aglutinador'|'razao', endpoint, params } }`
- `GET /api/contabil/contas/{ctared}/rollup?codemp` → `{ ctared, conta, aglutinadores[{codagl,descricao,direto}], indicadores_afetados[] }`

Tipos exportados: `AglutinadorDrillNode`, `AglutinadorComponente`, `ContaRollup`.

## 2. Atualizar tipos de indicadores

`src/lib/contabil/indicadoresApi.ts` — adicionar ao tipo `Indicador`:

```ts
drill?: {
  aglutinadores?: { codagl: number; descricao: string; endpoint: string; params: Record<string, any> }[];
  contas?: { ctared: number; endpoint: string; params: Record<string, any> }[];
}
```

## 3. Hooks (React Query)

`src/hooks/contabil/useAglutinadorDrill.ts` — `useAglutinadorDrill(codagl, params)` com `staleTime: 60_000`, lazy (habilita quando o nó é expandido).

`src/hooks/contabil/useContaRollup.ts` — `useContaRollup(ctared, codemp)`.

## 4. Novo componente: `DrillAglutinadorTree` (`src/components/contabil/DrillAglutinadorTree.tsx`)

Tree-table expansível, recursivo:

- Cada nó mostra: `operador` (chip +/−), `descricao`, `valor` formatado, botão expandir.
- Header do nó pai mostra `total` para conferência (soma dos filhos).
- Ao expandir aglutinador → chama `useAglutinadorDrill(codagl)` e renderiza os `componentes[]`.
- Ao clicar em componente `tipo=conta` (folha) → dispara callback `onOpenRazao({ ctared, params })`.
- Loading skeleton por nível; erro inline.
- Indentação por profundidade; sinal (+/−) já vem aplicado no `valor`.

## 5. Novo componente: `DrillIndicadorDrawer` (`src/components/contabil/DrillIndicadorDrawer.tsx`)

Drawer aberto ao clicar num indicador na tela **Indicadores Contábeis**:

- Header: nome do indicador, valor, unidade, fórmula.
- Corpo: para cada item em `indicador.drill.aglutinadores` renderiza um `DrillAglutinadorTree` (múltiplos ramos, ex.: Margem = numerador ÷ denominador — dois ramos).
- Para `indicador.drill.contas` (ex.: depreciação do EBITDA), renderiza linha direta com botão "Ver razão" → abre o `DrillDrawer` já existente (`@/components/dre-studio/DrillDrawer`) com `ctared` + período.

## 6. Reuso do razão existente

Reaproveitar `DrillDrawer` (dre-studio) — hoje ele consome `useDrillLancamentos(modelo_id, linha_id, …)`. Precisa aceitar um **modo alternativo por `ctared`** (sem `modelo_id`/`linha_id`), passando direto para `/api/contabil/drill-lancamentos?ctared=…&anomes_ini&anomes_fim&codemp`.

- Adicionar em `DrillLancamentosParams` (opcional) `ctared?: number` e permitir ausência de `modelo_id`/`linha_id`.
- Ajustar `useDrillLancamentos` para habilitar quando `ctared` OR (`modelo_id` + `linha_id`).
- `DrillDrawer` aceita nova prop `modoConta?: { ctared, descricao }` — header muda para "Razão — conta {clacta} {descricao}".

## 7. Botão "Onde este número entra?" (rollup reverso)

No `DrillDrawer` (razão) adicionar botão no header. Ao clicar:

- Chama `useContaRollup(ctared, codemp)`.
- Abre popover/dialog `RollupContaPanel` mostrando:
  - Cadeia de aglutinadores (badge "direto" quando `direto: true`).
  - Lista de `indicadores_afetados` como chips clicáveis (fecha o razão e navega para `/contabilidade/indicadores` destacando o indicador).

## 8. Integração na tela Indicadores Contábeis

`src/pages/contabilidade/IndicadoresContabeisPage.tsx`:

- Cada card/linha de indicador vira clicável (cursor-pointer + hover) quando tiver `indicador.drill`.
- Estado local `indicadorSelecionado` abre o `DrillIndicadorDrawer`.
- Ícone de lupa no canto do card para indicar drill disponível.

## 9. Integração na tela Fluxo de Caixa (Indireto)

`FluxoCaixaPage.tsx` — os blocos Operacional/Investimento/Financiamento do DFC Indireto usam aglutinadores. Se o backend devolver `codagl` em cada linha (a confirmar), plugar o `DrillAglutinadorTree` inline; caso contrário, deixar para próxima iteração e apenas documentar no arquivo `docs/`.

## 10. Documentação

`docs/backend-contabil-drill-cadeia.md` — contratos dos dois novos endpoints, exemplos JSON e mapa da UX (para o time de backend manter alinhamento).

## Fora de escopo

- Alterações no motor de razão (`DrillDrawer` só ganha um modo novo, sem refatorar auditoria/tooltips existentes).
- Export XLSX específico do drill de aglutinador (backend ainda não expõe; adicionar depois).
- Persistência do estado de expansão entre sessões.

---

## Detalhes técnicos

- **Recursão segura**: `DrillAglutinadorTree` limita profundidade a 8 níveis (guarda contra loops se o backend devolver referência circular).
- **Cache**: `queryKey: ['contabil','aglutinador-drill', codagl, anomes_ini, anomes_fim, codemp, codfil, base]`.
- **Sinal**: usar `valor` como veio do backend (já aplicado); mostrar `operador` só como badge visual.
- **Conferência**: no header do aglutinador, mostrar `soma(componentes.valor)` vs `total` — se diferir por > 0.01, badge amarelo "diferença".
- **Reuso do drawer de razão**: preservar todas as funcionalidades atuais (usuário origem, centro de custo, aumentar limite, histórico rolável).
- **Navegação**: chips de "indicadores afetados" usam `useNavigate` para `/contabilidade/indicadores?highlight={slug}` e a página faz scroll/pulse no card correspondente.

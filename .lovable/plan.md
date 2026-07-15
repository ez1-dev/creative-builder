## Objetivo

Ativar no frontend o novo contrato do backend para o menu de drills da DRE e do Balanço (padrão Senior: grupos `REABRIR` / `CONSULTA`), lendo dinamicamente `linha.drillavel` e `linha.drills_menu` sem lista fixa, mantendo compatibilidade com o payload antigo (`linha.drills`).

Nada de backend, cálculo, RLS ou endpoints novos. Apenas leitura do payload, um componente compartilhado e o parâmetro `incluir_drills=true` no `/resultado-cache`.

## Arquivos alterados / criados

### 1. Tipos — `src/types/contabil.ts`
Estender `ComparativoLinhaV2` (linhas ~183-186) com:
```ts
drillavel?: boolean;
drills?: Array<string | { chave: string; label?: string | null }>; // legado, manter
drills_menu?: DrillMenuItem[]; // novo contrato Senior
codigo_linha?: string | null;
```
Importar `DrillMenuItem` do novo módulo.

### 2. Módulo compartilhado — `src/lib/contabil/drillsMenu.ts` (novo)
Define:
```ts
export interface DrillMenuItem {
  grupo?: string;          // "REABRIR" | "CONSULTA" | outros
  label?: string;
  chave?: string;
  acao?: string;           // "reabrir" | "consulta"
  agrupar_por?: string;    // "conta" | "centro_custo" | ...
  endpoint?: string;
  icone?: string;
  ordem?: number;
  [k: string]: any;        // preserva campos extras
}
export interface LinhaDrillContract {
  linha_id: string;
  codigo?: string | null;
  codigo_linha?: string | null;
  descricao?: string | null;
  drillavel?: boolean;
  drills_menu?: DrillMenuItem[];
  drills?: Array<string | { chave: string; label?: string | null }>;
}
export function possuiDrill(l: LinhaDrillContract): boolean;
export function normalizarDrillsMenu(l: LinhaDrillContract): DrillMenuItem[];
```
`normalizarDrillsMenu` prioriza `drills_menu`. Se estiver ausente **mas** `drills` legado tiver itens, converte cada dimensão em `{ grupo: "CONSULTA", label: DRILL_LABELS[dim], acao: "consulta", agrupar_por: dim, endpoint: "/api/contabil/drill-dre" }`. Ordena por `ordem` quando presente e depois pela ordem original.

### 3. Componente reutilizável — `src/components/dre-studio/DrillsMenu.tsx` (novo)
Substitui o `DrillMenu` atual (arquivo `DrillMenu.tsx` fica como shim reexportando o novo, para não quebrar outros consumidores). Props:
```ts
type DrillsMenuProps = {
  linha: LinhaDrillContract;
  onSelect: (item: DrillMenuItem) => void;
  disabled?: boolean;
};
```
Comportamento:
- Se `!possuiDrill(linha)` → não renderiza nada (retorna `null`; tooltip “sem contas vinculadas” só quando explicitamente forçado — fora do escopo aqui).
- Renderiza `DropdownMenu` com o mesmo trigger visual atual (ícone `Search`).
- Agrupa itens usando `item.grupo || "CONSULTA"`; ordem fixa dos grupos: `REABRIR`, `CONSULTA`, depois demais grupos na ordem de aparição.
- Cada grupo tem seu `DropdownMenuLabel` (uppercase) + `DropdownMenuSeparator`.
- Cada item exibe `item.label` (sem tradução manual) e um ícone padrão por `agrupar_por` (`conta`/`conta_contabil`→BookOpen, `centro_custo`→Building2, `historico`→FileText, `lancamento`→Receipt, `unidade_negocio`→Landmark, fallback ícone genérico). O ícone é apenas visual — não altera semântica.

### 4. Roteamento da ação — `src/components/dre-studio/DrillResultadoPanel.tsx`
Estender `DrillResultadoContext` com:
```ts
acao?: "reabrir" | "consulta" | string;
endpoint?: string | null;
agrupar_por_raw?: string; // valor original do backend (ex.: "conta")
```
E `agrupar_por` continua tipado como `DrillDimensao` normalizado (via `normalizarDrillDimensao`). Se `endpoint` for informado e diferente de `/api/contabil/drill-dre`, usar `contabilApi.get(endpoint, query)` diretamente (nova função `fetchDrillDreCustom` em `drillDreApi.ts` que aceita endpoint override; assinatura idêntica, chamada única, sem mudar `fetchDrillDre` existente).

Título do drawer usa `item.label` recebido ou `DRILL_LABELS[dim]` como fallback. Quando `acao === "reabrir"`, prefixar título com “Reabrir — ” e preservar o restante do painel (mesma tabela dinâmica com colunas retornadas pelo backend).

### 5. `/resultado-cache` recebe `incluir_drills=true` — `src/hooks/contabil/api.ts`
Em `useResultadoCache` (linhas 709-735):
- Acrescentar ao objeto de query:
  ```ts
  incluir_drills: true,
  consolidado: filtros.consolidado ? true : undefined,
  ```
- Bump da queryKey: `["contabil", "resultado-cache", "v3-drills", modeloId, filtros]` para invalidar o cache antigo do TanStack.
- Manter todos os demais filtros (`codemp`, `codfil`, `codccu`, `modo_balanco`, `data_corte`, `aplicar_referencia_senior`, `expandir_resultado_exercicio`).

Nada é removido; `codfil` e `consolidado` continuam sendo enviados quando presentes.

### 6. Preservar campos no normalizador — `src/hooks/contabil/api.ts` (função `normalizeComparativo`, ~linha 438+)
Ao mapear cada linha da resposta, copiar (quando presentes): `drillavel`, `drills`, `drills_menu`, `codigo_linha`. Nada mais é alterado no normalizador (valores/estrutura permanecem).

### 7. DRE Studio Visualização — `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`
Trocar o uso de `<DrillMenu drills={l.drills} ... />` (linha 2522) por `<DrillsMenu linha={l} onSelect={(item) => setDrillCtx({...})} />`. O `onSelect` recebe o `DrillMenuItem` cru, e monta `drillCtx` com:
```ts
acao: item.acao,
endpoint: item.endpoint,
agrupar_por: normalizarDrillDimensao(item.agrupar_por ?? "") ?? "conta_contabil",
agrupar_por_raw: item.agrupar_por,
```
A condição de renderização passa a ser `possuiDrill(l) && l.linha_id`.

### 8. BI DRE (`/bi/contabilidade/dre`) — `src/lib/contabil/dreMatrizApi.ts` + `src/pages/bi/contabilidade/DrePage.tsx`
- Em `normalizarLinha`, preservar `drillavel`, `drills`, `drills_menu`, `linha_id`, `codigo_linha` como campos opcionais no tipo `DreLinhaApi`.
- No DrePage, onde hoje há o `ContextMenu`/`DreDrillDrawer` legado, adicionar (sem remover o legado, para não regredir) o `<DrillsMenu linha={...} onSelect={...} />` ao lado da descrição da linha quando `possuiDrill(l)` for verdadeiro. `onSelect` dispara o mesmo `DrillResultadoPanel` do Studio (importar de `@/components/dre-studio/DrillResultadoPanel`), montando o contexto com `modeloId = meta.modelo_id`, `linhaId = l.linha_id`, filtros do estado atual.
- Se `meta.modelo_id` ou `l.linha_id` forem ausentes, o menu simplesmente não renderiza (fallback silencioso).

### 9. Invalidação de cache — `src/hooks/contabil/useVincularContasDRESenior.ts` e `useVincularContasBalancoSenior.ts`
Atualizar a queryKey invalidada de `["contabil", "resultado-cache", modeloId]` para o prefixo novo `["contabil", "resultado-cache", "v3-drills"]` (mantendo `modeloId` compatível via `predicate`). Detalhe técnico: usar `qc.invalidateQueries({ predicate: q => q.queryKey[0]==="contabil" && q.queryKey[1]==="resultado-cache" })` para pegar qualquer versão.

## Fora de escopo

- Backend Python, endpoints, fórmulas, RLS, Supabase, autenticação, config.toml.
- Alterar cálculo, ordem contábil, saldo, movimentação.
- Adicionar `incluir_drills` em `/dre/matriz` (a spec explícita diz para não adicionar).
- Refatorar o `DreDrillDrawer` legado da BI (mantém funcionando; o novo menu vive ao lado).
- Estilo/animações do dropdown além do necessário para ler `label`/agrupar por `grupo`.

## Aceite

1. `/resultado-cache` passa a receber `incluir_drills=true`, preservando `codfil`/`consolidado`/demais filtros.
2. Linha com `drillavel=true` e `drills_menu` não vazio mostra o botão de drill; caso contrário, não.
3. Menu exibe `REABRIR` acima de `CONSULTA`, com os labels vindos do backend.
4. Ao clicar num item, o painel usa `endpoint`, `agrupar_por` e `acao` do próprio item.
5. Toda chamada de drill usa `modelo_id` + `linha_id` (nunca `codigo`, `clacta` ou `ctared` derivados do código).
6. O mesmo componente `DrillsMenu` é usado na página do DRE Studio Visualização e na página BI da DRE.
7. Payloads antigos com `drills` (array de dimensões) continuam funcionando por conversão automática para `grupo=CONSULTA`.
8. Cache antigo do TanStack Query fica invalidado pelo bump da queryKey.
9. `tsgo` passa sem erros; a UI da tabela e os filtros do Studio/Balanço continuam idênticos ao que já é hoje quando o backend ainda não enviar `drills_menu`.

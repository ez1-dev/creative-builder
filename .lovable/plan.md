## Objetivo

Adequar a **tela DRE Studio › Visualização** para consumir a nova estrutura já publicada pelo backend (grupos 7, 7.1, 7.2, 8, 8.1, 8.2, 9, 9.1, 10 — sem 6.2/6.3), removendo qualquer referência fixa a códigos antigos. Nenhuma linha, fórmula ou cálculo é criado no frontend — a tela apenas renderiza o payload da API.

## Pré-requisito operacional (fora do código)

- Reiniciar a API 8070 com a versão nova do backend.
- Após o restart, invalidar cache do React Query e do navegador para evitar reuso de respostas antigas (feito no código via bump de chave, ver passo 4).

## Alterações no frontend

### 1. `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`

- **Remover o filtro de "salvaguarda" que descarta linhas** (linhas ~529–543) que hoje remove `8.2`, `9.9`, `VINCULAR.8.2`, `VINCULAR.9.9`. Passar a usar `linhasApiRaw` diretamente como `linhasApi`. Essas linhas fazem parte da nova estrutura oficial (7.2, 8.2, 9.1) — não podem mais ser bloqueadas.
- **Remover o rótulo hardcoded `"Resultado Líquido"`** no branch `isVirtualTotal` (linha ~2387). Passar a exibir a descrição vinda da API (`l.descricao || l.descricao_linha`). O reconhecimento de "linha total" continua sendo por `tipo_registro === "TOTAL"`, não pelo código.
- **Manter** a lógica de árvore por `linha_id` / `linha_pai_id`, `codigo_pai` e `ordem` — já é o comportamento correto. Não introduzir novas regras por código.
- **Não alterar** as regras específicas do Balanço (`isLinha000`, `isLinha98`, `isLinha99`, `isLinhaTotalGeral`, `isLinhaVincular`, `CODIGOS_NIVEL_1_BALANCO`) — pertencem ao modelo de Balanço Senior, não à DRE reorganizada.
- **Exportações (Excel/CSV/PDF)**: já iteram sobre `linhas` derivadas de `linhasApi`. Como o filtro do passo 1 é removido, as exportações passarão automaticamente a refletir a nova estrutura. Verificar que nenhum caminho de export mantém código antigo hardcoded (fazer um `rg` de segurança em `exportar`/`toXlsx` dentro do arquivo).

### 2. `src/components/dre-studio/ComposicaoDREDialog.tsx`

- Remover `if (code === "9") return "Resultado Líquido";` em `rotuloDescricao` — usar sempre `descricao_linha` da API.
- Remover a condição `code === "9"` do cálculo de `isTotal` (linha ~174). Deixar apenas `tipo === "TOTAL"`; o backend marca a linha total pelo `tipo_registro`.

### 3. `src/components/dre-studio/ConciliacaoDREBalancoPanel.tsx`

- `findResultadoLiquido`: parar de procurar por `codigo === "9"`. Buscar a linha total do modelo pelos campos semânticos vindos da API, nesta ordem:
  1. `l.tipo_linha === "TOTAL"` **e** `l.linha_pai_id == null` (raiz);
  2. fallback: última linha em `dreResultado.linhas` com `tipo_linha === "TOTAL"`.
- Atualizar o subtítulo do card (linha ~95) de `"Resultado DRE (linha 9) acumulado..."` para `"Resultado DRE (linha total do modelo) acumulado..."`.

### 4. Invalidação de cache do React Query

Depois do restart o usuário pode ter respostas velhas em memória. Bumpar a versão das chaves das queries relacionadas à DRE para forçar refetch em qualquer sessão já aberta, sem apagar cache de outras áreas:

- `src/hooks/contabil/api.ts`: adicionar sufixo `"v2"` nas `queryKey` de:
  - `["contabil", "modelos", ...]` → `["contabil", "modelos", "v2", ...]`
  - `["contabil", "modelo", modeloId]` → `["contabil", "modelo", "v2", modeloId]`
  - `["contabil", "resultado-cache", modeloId, filtros]` → `["contabil", "resultado-cache", "v2", modeloId, filtros]`
  - `["contabil", "resultado-pronto", modeloId, filtros]` → idem
  - `["contabil", "drill-lancamentos", ...]` → idem
  - `["contabil", "drill-linha", ...]` → idem
- `src/hooks/contabil/useDrillDre.ts`: `["contabil", "drill-dre", params]` → `["contabil", "drill-dre", "v2", params]`
- Atualizar TODOS os `invalidateQueries` no mesmo arquivo para usar as chaves novas (fazer busca completa em `queryKey: ["contabil"` para não deixar invalidação órfã).
- Confirmar que nenhum lugar persiste esses dados em `localStorage`/`sessionStorage`. Se existir persister do React Query, também bumpar `buster`.

### 5. Drills

Auditar `DrillDrawer`, `DrillMenu`, `DrillResultadoPanel` para garantir que a chamada de drill usa `modelo_id + linha_id` (já é o padrão via `useDrillDre`) e não recompõe `clacta`/`ctared` a partir de `linha.codigo`. Se houver ocorrência, substituir por `linha_id`. Manter o gate `linha.drillavel === true && Array.isArray(linha.drills) && linha.drills.length > 0` onde aplicável.

## Fora de escopo

- Backend Python, RLS, chaves Supabase, autenticação, endpoints da API.
- Estrutura do modelo no banco, vínculos conta↔linha, fórmulas contábeis, cálculo de realizado.
- `ValidacaoCCCC106` (usa código `"999"` do Balanço Senior — outro modelo).
- Regras do Balanço Senior baseadas em `startsWith("9")`, `isLinha98`, `isLinha000`, `VINCULAR`, `CODIGOS_NIVEL_1_BALANCO` — pertencem ao modelo de Balanço, não à DRE.
- Recriar linhas, mover contas, ou calcular subtotais/totais no React.

## Validação (após restart da API)

1. Abrir `/contabilidade/dre-studio/<modelo DRE Padrão teste 1>/visualizacao` no ano 2026.
2. Conferir que aparecem as linhas 7, 7.1, 7.2, 8, 8.1, 8.2, 9, 9.1, 10 e que 6.2/6.3 não aparecem.
3. Conferir que os grupos 7 e 8 não estão zerados.
4. Comparar os totais retornados com as referências: Receita Bruta 68.526.993,19 · Resultado Financeiro 211.037,03 · Outras Rec/Desp 160.406,43 · Resultado Líquido 7.334.935,12. Não fixar esses números no código.
5. Testar drill em uma linha analítica (verificar payload usa `modelo_id + linha_id`).
6. Exportar Excel/PDF e conferir que reflete a nova estrutura.
7. Se algum total divergir, imprimir no console o payload de `/api/contabil/dre/matriz` (ou do `resultado-cache` usado) e os filtros aplicados.

## Relatório final ao usuário

Ao terminar, listar: arquivos alterados, chaves de query invalidadas/bumpadas, componentes onde referências fixas a códigos antigos foram removidas, confirmação de que 6.2/6.3 não voltaram, payload recebido da API após restart, e resultado numérico dos códigos 7, 8, 9 e 10.

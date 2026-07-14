## Objetivo
Implementar menu **"LISTA DE DRILLS"** nas linhas drilláveis da matriz da DRE Studio, com 5 dimensões (Centro de Custos, Conta Contábil, Histórico, Lançamento, Unidade de Negócio) e resultado em painel lateral. Zero cálculo no frontend — o backend já expõe `drillavel`, `drills[]`, `linha_id` na resposta de `/api/contabil/dre/matriz` e um novo endpoint `/api/contabil/drill-dre`.

## Arquivos a criar
1. **`src/lib/contabil/drillDreApi.ts`** — cliente do novo endpoint.
   - `type DrillDimensao = 'centro_custo' | 'conta_contabil' | 'historico' | 'lancamento' | 'unidade_negocio'`
   - `interface DrillDreParams { modelo_id; linha_id?; codigo_linha?; agrupar_por: DrillDimensao; codemp?; codfil?; anomes_ini; anomes_fim; unidade?; centro_custo?; modo_balanco?; page?; page_size? }`
   - `interface DrillDreResponse { columns: {key,label,format?}[]; rows: any[]; total?: number; total_linha?: number; page?; page_size?; has_more? }`
   - `fetchDrillDre(params)` → `GET /api/contabil/drill-dre` usando `contabilApi.get` (mesmo cliente/headers de `dreMatrizApi.ts`, sem token/CORS custom).

2. **`src/components/dre-studio/DrillMenu.tsx`** — Popover/DropdownMenu shadcn com título "LISTA DE DRILLS", itens dinâmicos vindos de `linha.drills`, ícones (`Building2`, `BookOpen`, `FileText`, `Receipt`, `Landmark`), mapeamento de labels PT-BR.

3. **`src/components/dre-studio/DrillResultadoPanel.tsx`** — Sheet lateral (desktop) / full-screen (mobile) que:
   - Renderiza cabeçalho: `Drill — <descrição>` + dimensão + período + código + filtros ativos.
   - Renderiza tabela com colunas dinâmicas de `response.columns` (formato currency/number/text). Formatos padronizados (Intl BRL, negativos entre parênteses).
   - Rodapé: `Total do drill`, `Total da linha` (recebido via prop), `Diferença` (apenas visual).
   - Estados: loading (Skeleton), vazio ("Nenhum lançamento encontrado…"), erro (mensagem + detalhe expansível).
   - Paginação incremental quando `has_more`.
   - Botões: **Exportar CSV**, **Exportar XLSX** (se `xlsx` já presente no projeto — caso contrário só CSV+copiar), **Copiar tabela**.
   - Nome do arquivo: `drill-dre-<slug-linha>-<dimensao>-<anomes_ini>-<anomes_fim>`.

4. **`src/hooks/contabil/useDrillDre.ts`** — hook React Query encapsulando `fetchDrillDre`, chave = `[modelo_id, linha_id, agrupar_por, filtros, page]`, com `enabled` dependendo de linha drillável e painel aberto.

## Arquivos a modificar

5. **`src/lib/contabil/dreStudioTypes.ts`** (ou onde `ComparativoLinhaV2` está definido, em `src/types/contabil.ts`) — adicionar campos opcionais na linha da matriz:
   ```ts
   drillavel?: boolean;
   drills?: DrillDimensao[];
   linha_id: string; // já existente
   ```
   (sem quebrar tipagens; só leitura no frontend).

6. **`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`** — na renderização de cada `<tr>` da matriz:
   - Se `linha.drillavel === true && linha.drills?.length > 0`, mostrar ícone `MoreVertical`/lupa numa coluna de ação (ou ao passar o mouse) que abre `DrillMenu`.
   - Ao escolher dimensão: setar estado `drillSelecionado = { linha, dimensao }` e abrir `DrillResultadoPanel` com os filtros ativos (`modelo_id = id`, `codemp`, `codfil = codfilNum`, `anomes_ini = ini`, `anomes_fim = fim`, `centro_custo = codccu !== 'todos' ? codccu : undefined`, `modo_balanco = modoBalancoEfetivo`).
   - Linhas sem drill: opcional Tooltip "Esta linha é calculada por fórmula e não possui contas vinculadas para drill." Nenhum menu clicável.
   - Manter o `DrillDrawer` antigo intocado (o novo painel é substituição visual, mas não removemos o hook `useDrillLancamentos` neste plano; podemos deprecar o dispositivo antigo em iteração futura).

## Regras chave (contrato)
- Frontend nunca infere drillabilidade — sempre `linha.drillavel && drills.length > 0`.
- Frontend envia **`linha_id` como preferencial**, `codigo_linha` como fallback. Nunca envia lista de contas nem `ctared`.
- Paginação usa `page/page_size/has_more/total` quando presentes.
- Não altera cálculos, endpoints existentes, autenticação, `.env` nem backend.

## Detalhes técnicos
- Reutilizar `contabilApi` (`src/lib/contabil/contabilApi.ts`) para headers/base URL (mesmo padrão de `fetchDreMatriz`).
- Formatadores: reaproveitar `fmtBRL` de `MoneyCell` e criar `fmtPctBR`, `fmtDateBR` no próprio painel.
- Responsivo: `Sheet side="right"` com `w-full sm:max-w-4xl`; em mobile ocupa 100% via classes tailwind.
- Exportação XLSX: verificar `package.json` no momento da build — se `xlsx` estiver ausente, gerar somente CSV; não adicionar dependência nova sem pedir.
- Sem tests novos; a interface é aditiva.

## Critérios de aceite (frontend)
- Menu só aparece em linhas com `drillavel=true`.
- Menu lista exatamente `linha.drills`.
- Painel chama `/api/contabil/drill-dre` com `modelo_id + linha_id + agrupar_por + filtros`.
- Tabela usa `columns` do backend; totais/diferença exibidos.
- Linhas TOTAL/SUBTOTAL sem drill não mostram menu.
- Loading/vazio/erro tratados; export CSV funciona.

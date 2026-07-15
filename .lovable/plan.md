## Objetivo

Alinhar o drill da DRE ao novo contrato do backend: usar sempre `meta.modelo_id` + `linha.linha_id`, montar o menu a partir de `linha.drills`, adicionar suporte a `lancamento` via `/api/contabil/drill-lancamentos` (com colunas Lote/Número/Débito/Crédito separadas) e remover qualquer envio de `clacta`/`ctared` como código da linha da DRE.

## Arquivos alterados

1. **`src/lib/contabil/drillDreApi.ts`** (revisão do cliente)
   - `DrillDreParams`: tornar `linha_id` obrigatório; **remover** `codigo_linha` (o backend resolve tudo por `linha_id`).
   - `fetchDrillDre`: enviar somente `modelo_id`, `linha_id`, `agrupar_por`, `anomes_ini`, `anomes_fim` e os filtros da matriz (`codemp`, `codfil`, `unidade`, `centro_custo`). Nunca enviar `clacta`/`ctared`.
   - Manter `normalizarDrillDimensao` e `DRILL_LABELS`, mas passar a **priorizar `drill.label`** vindo da API quando presente.

2. **`src/lib/contabil/drillLancamentosApi.ts`** (novo)
   - Função `fetchDrillLancamentos({ modelo_id, linha_id, anomes_ini, anomes_fim, codemp?, codfil?, unidade?, centro_custo?, limite=5000 })`.
   - Chama `GET /api/contabil/drill-lancamentos` via `contabilApi`.
   - Retorna `{ itens, truncado, qtd_total }` com tipagem dos campos: `data`, `lote`, `numero`, `debito`, `credito`, `ccu`, `historico`, `valor`.

3. **`src/hooks/contabil/useDrillLancamentos.ts`** (novo)
   - React Query wrapper para `fetchDrillLancamentos`, enabled quando o painel abre com dimensão `lancamento`.

4. **`src/components/dre-studio/DrillMenu.tsx`**
   - Trocar o mapeamento fixo de opções para **iterar `linha.drills`** recebidos da API (`chave` + `label`).
   - Aceitar prop `drills: Array<{ chave: string; label: string }>` (retrocompatível com `string[]`).
   - Ícones continuam por `chave` normalizada; o rótulo exibido usa `drill.label` quando vier.
   - Título mantém "Lista de Drills".

5. **`src/components/dre-studio/DrillResultadoPanel.tsx`**
   - Remover envio de `codigo_linha`; exigir `linhaId`.
   - Quando `ctx.agrupar_por === 'lancamento'`, usar `useDrillLancamentos` e renderizar tabela dedicada com colunas separadas:
     `Data | Lote | Número | Débito | Crédito | Centro de Custo | Histórico | Valor`
     - `Data` formatado `dd/MM/yyyy`; `Débito`, `Crédito`, `Valor` em BRL; nunca concatenar Lote/Número.
     - Se `truncado === true`, exibir aviso: "Foram exibidos os primeiros 5.000 lançamentos de um total de {qtd_total} registros. Refine o período ou os filtros para visualizar menos registros." (não é erro).
     - Empty state: "Nenhum dado encontrado para esta linha e período."
   - Para as demais dimensões, manter o fluxo atual (`useDrillDre`), apenas sem `codigo_linha`.
   - Exportações CSV/XLSX suportam as duas fontes.

6. **`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`**
   - No `setDrillCtx` chamado pelo `DrillMenu`: remover `codigoLinha` do payload; garantir que só é aberto quando `l.linha_id` existe.
   - Nenhuma outra lógica da matriz é tocada (usos internos de `clacta`/`ctared` para exibição de colunas de plano de contas permanecem — não são enviados a drills).

## Chamadas HTTP resultantes

- Dimensões agregadas (`centro_custo`, `conta_contabil`, `historico`, `unidade_negocio`):
  ```
  GET /api/contabil/drill-dre
    ?modelo_id={meta.modelo_id}
    &linha_id={linha.linha_id}
    &agrupar_por={drill.chave}
    &anomes_ini={ini}&anomes_fim={fim}
    [&codemp=&codfil=&centro_custo=&unidade=]
  ```
- Lançamentos:
  ```
  GET /api/contabil/drill-lancamentos
    ?modelo_id={meta.modelo_id}
    &linha_id={linha.linha_id}
    &anomes_ini={ini}&anomes_fim={fim}
    &limite=5000
    [&codemp=&codfil=&centro_custo=&unidade=]
  ```

Headers e base URL reutilizam `contabilApi` (mesma auth e `ngrok-skip-browser-warning` já usados nas demais rotas `/api/contabil/*`).

## Remoção explícita de `clacta`/`ctared` nos drills

- `drillDreApi.ts`: retirar aceitação/envio de `codigo_linha` como fallback.
- `DrillResultadoPanel.tsx`: parar de passar `codigo_linha`.
- `DrillDrawer.tsx` (legacy) permanece apenas para os fluxos antigos de plano de contas que não fazem parte do drill da DRE; o menu "Lista de Drills" nunca o invoca.
- Nenhuma resolução de contas contábeis no frontend.

## Estados e formatação

- Carregando / vazio / erro: já implementados no painel, textos ajustados conforme spec.
- Moeda: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`, negativos entre parênteses (padrão atual).
- Datas: `dd/MM/yyyy`.

## Critérios de aceite atendidos

1–14 conforme spec (drills por `modelo_id`+`linha_id`, menu vindo da API, colunas Lote/Número/Débito/Crédito separadas, respeito a `truncado`/`qtd_total`, sem `clacta=linha.codigo`).

## Fora de escopo

Backend Python, cálculos, modelo, vínculos de contas, Cloud/RLS, autenticação, URL global e endpoints existentes — nada alterado.

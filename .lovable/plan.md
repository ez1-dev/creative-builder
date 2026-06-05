# Corrigir gráfico IA: Peças/Serviços normalizado, total = CONSOLIDADO, diagnóstico de vazio

## Contexto

Hoje o frontend (`src/lib/bi/iaChartApi.ts`) envia `prompt + filtros base` direto para `POST /api/bi/comercial/ia-grafico`. A FastAPI interpreta e roda a query. Quando o prompt é "faturamento total separado por Peças e Serviços":

- A IA está forçando `unidade_negocio = GENIUS` mesmo sem o usuário mencionar Genius.
- A separação Peças/Serviços está sendo feita por igualdade exata em `cd_origem`, então combinações como `PECAS`, `PEÇAS`, `SERV`, `SERVICOS`, ou serviços marcados em `cd_tp_movimento` ficam fora → série vazia → "Sem dados para exibir".
- Quando vazio, o gráfico não diz **quais filtros** foram aplicados, dificultando o diagnóstico.

A maior parte do fix é **no backend FastAPI** (não está neste repo). Aqui no Lovable atualizamos: (1) o contrato/documentação que orienta o backend, (2) a edge function `bi-ia-chart` (ainda usada como referência de prompt/whitelists), e (3) o frontend para mostrar a mensagem de diagnóstico quando vier vazio.

## Mudanças

### 1. `docs/backend-bi-ia-grafico.md` (contrato atualizado)

Adicionar/ajustar:

- **Nova dimensão**: `categoria_custom` na whitelist de `dimensao`. Quando recebida, o backend agrega via:
  ```sql
  case
    when upper(trim(coalesce(cd_origem, ''))) like 'PE%' then 'PEÇAS'
    when upper(trim(coalesce(cd_origem, ''))) like 'SERV%'
      or upper(trim(coalesce(cd_tp_movimento, ''))) like 'SERV%' then 'SERVIÇOS'
    else 'OUTROS'
  end as categoria
  ```
  Filtrar apenas as labels presentes em `categorias` (default `["PEÇAS", "SERVIÇOS"]`), descartando `OUTROS` salvo se vier explicitamente.

- **Novo campo opcional no body**: `categorias: string[]` (usado só quando `dimensao = "categoria_custom"`).

- **Novo campo opcional no body**: `mostrar_valor: boolean`.

- **Regra `unidade_negocio`**:
  - Se o prompt mencionar "Genius" → `unidade_negocio = "GENIUS"`.
  - Se o prompt mencionar "Estrutural" / "Zortea" → `"ESTRUTURAL ZORTEA"`.
  - Se o prompt disser "total"/"consolidado"/"geral" **ou** não mencionar unidade alguma → `unidade_negocio = "CONSOLIDADO"` (não aplicar filtro de unidade no SQL).
  - O filtro base (`filtros.unidade_negocio`) vindo do dashboard só é aplicado se for **diferente** de `"CONSOLIDADO"` e o prompt não tiver pedido explicitamente outra coisa.

- **Normalização padrão de comparações textuais** no backend: sempre `upper(trim(coalesce(campo, '')))` para `cd_origem`, `cd_tp_movimento`, `unidade_negocio`, etc.

- **Diagnóstico quando vazio**: em vez de retornar 422, retornar `200` com `series: []` e um bloco `diagnostico`:
  ```json
  {
    "titulo": "...",
    "tipo_grafico": "donut",
    "metrica": "faturamento",
    "dimensao": "categoria_custom",
    "total": 0,
    "series": [],
    "filtros": { "unidade_negocio": "CONSOLIDADO" },
    "diagnostico": {
      "linhas_view": 0,
      "filtros_aplicados": { "anomes_ini": "202601", "anomes_fim": "202612" },
      "unidade_negocio": "CONSOLIDADO",
      "periodo": { "ini": "202601", "fim": "202612" },
      "dimensao": "categoria_custom"
    }
  }
  ```

### 2. `supabase/functions/bi-ia-chart/index.ts`

Mesmo que o frontend atual não chame mais este edge (FastAPI interpreta direto), mantemos o prompt sincronizado para futuras reativações e como documentação executável:

- Acrescentar `"categoria_custom"` em `DIMENSOES`.
- Adicionar ao `SYSTEM_PROMPT` as regras:
  - "Peças e Serviços" / "peças vs serviços" / "categoria" → `dimensao = "categoria_custom"`, `categorias = ["PEÇAS", "SERVIÇOS"]`.
  - Se o prompt disser "total"/"consolidado"/"geral" sem citar Genius/Estrutural → `filtros.unidade_negocio = "CONSOLIDADO"` (e o backend tratará como sem filtro).
  - Só inferir `unidade_negocio = "GENIUS"` quando o texto contiver "Genius".
- Adicionar `categorias: string[]` e `mostrar_valor: boolean` no schema da tool.

### 3. `src/lib/bi/iaChartApi.ts`

- Estender `AiDimensao` com `"categoria_custom"`.
- Estender `AiChartResult` com `diagnostico?: { linhas_view: number; filtros_aplicados: Record<string,string>; unidade_negocio: string; periodo: { ini: string; fim: string }; dimensao: string }`.
- Quando `prompt` mencionar "total"/"consolidado"/"geral" **e não** mencionar Genius/Estrutural, sobrescrever `unidade_negocio` enviado para `"CONSOLIDADO"` (defesa em profundidade do lado do frontend, para o caso do filtro global estar em Genius).

### 4. `src/components/bi/ai/AiChartGenerator.tsx`

- Quando `result.series.length === 0`, renderizar um card de diagnóstico no lugar do gráfico, listando:
  - "Nenhum dado encontrado com os filtros aplicados."
  - Linhas na view: `diagnostico.linhas_view`
  - Período: `ini` – `fim`
  - Unidade: `unidade_negocio`
  - Dimensão: `dimensao`
  - Lista de `filtros_aplicados`.
- Adicionar label `categoria_custom → "Categoria (Peças/Serviços)"` em `DIM_LABEL`.

## Critério de aceite

- Prompt "faturamento total separado por Peças e Serviços" → `unidade_negocio = "CONSOLIDADO"`, `dimensao = "categoria_custom"`, series com `PEÇAS` e `SERVIÇOS` agregadas pela regra normalizada.
- Prompt mencionando "Genius" continua usando `GENIUS`.
- Resultado vazio mostra card de diagnóstico com filtros aplicados, período, unidade e dimensão — nunca tela em branco silenciosa.
- Comparações Peças/Serviços feitas por `upper(trim(coalesce(...)))` + `like 'PE%' / 'SERV%'`, não por igualdade exata.

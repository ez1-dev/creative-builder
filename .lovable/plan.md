
## Problema

O `ComercialDrillDrawer` hoje injeta no contexto qualquer coluna conhecida que vier na linha (`cd_nf`, `cd_produto`, `cd_cliente`, `cd_estado`, `cd_rev_pedido`, `anomes_emissao`) e o botão "Trocar drill" empurra o próximo nível **carregando todo o contexto anterior**. Isso gera combinações impossíveis (ex.: GENIUS + 202601 + cd_cliente 263 + cd_estado MS + cd_rev_pedido 4352), que vão à FastAPI e voltam vazias sem diagnóstico.

A correção é toda no frontend: respeitar o `filtros_drill` que o backend emite por linha, deixar o usuário decidir o que carregar entre níveis, e tratar bem o "vazio".

---

## Mudanças

### 1. API: aceitar `filtros_drill` por linha e `diagnostico` no response

`src/lib/bi/comercialDrillApi.ts`

- Adicionar `filtros_drill?: Partial<DrillContexto>` em cada `row` (o backend já pode mandar; só vamos consumir).
- Adicionar bloco opcional na resposta:

```ts
diagnostico?: {
  qtd_linhas_base?: number;
  qtd_linhas_apos_unidade?: number;
  qtd_linhas_apos_mes?: number;
  qtd_linhas_apos_cliente?: number;
  qtd_linhas_apos_uf?: number;
  qtd_linhas_apos_revenda?: number;
  qtd_linhas_apos_produto?: number;
  filtros_aplicados?: Record<string, any>;
};
```

- `fetchComercialDrill` repassa esses campos sem transformar.
- Sem mudança de URL nem de contrato de envio.

### 2. Stack do drill: API mais restrita

`src/hooks/useComercialDrillStack.ts`

- `pushDrill(next, rowFilters, opts?: { mergeWithCurrent?: boolean })`:
  - **default `mergeWithCurrent = false`** → o nível novo usa **apenas** `rowFilters` + os filtros do nível atual que pertencem a campos compatíveis com o `next` (ver tabela abaixo).
  - Quando o usuário troca de drill via botão "Trocar drill", chamamos `pushDrill(next, {}, { mergeWithCurrent: true })` mas **passando pela mesma função de compatibilidade** (sem inventar `cd_cliente` etc.).
- Nova ação `removeContextKey(key)`:
  - Remove a chave do nível atual.
  - Também limpa essa chave nos níveis ancestrais marcados (para o breadcrumb funcionar de verdade).
- Nova ação `replacePath(next, rowFilters)` para o caso "limpar e começar caminho novo" (item 4 do pedido).
- `goTo(index)` continua existindo (volta ao nível clicado, descarta filhos).

**Tabela de compatibilidade** (novo arquivo `src/lib/bi/comercialDrillCatalog.ts`):

```text
ALLOWED_CTX_KEYS[next_drill] = chaves que podem sobreviver vindas do contexto anterior
ACUMULADO         → todas
MENSAL            → anomes_emissao, cd_origem, categoria_custom
ESTADO            → anomes_emissao, cd_estado, cd_origem, categoria_custom
CLIENTE           → anomes_emissao, cd_estado, cd_cliente, cd_origem, categoria_custom
REVENDA           → anomes_emissao, cd_estado, cd_rev_pedido, cd_origem, categoria_custom
PRODUTO           → anomes_emissao, cd_estado, cd_cliente, cd_rev_pedido, cd_produto, cd_origem, categoria_custom
NOTA_FISCAL       → todas exceto cd_produto
DETALHES_IMPOSTOS → cd_nf, cd_produto, anomes_emissao, cd_cliente
```

Função `mergeCtx(currentCtx, rowFilters, nextDrill, { keepAll })`:
1. Se `keepAll` (usuário clicou em linha) → começa com `currentCtx` filtrado por `ALLOWED_CTX_KEYS[nextDrill]`, depois aplica `rowFilters` (row vence).
2. Se troca manual (botão) → mesma coisa, mas `rowFilters` é vazio.
3. `replacePath` → começa do zero, só `rowFilters`.

### 3. Drawer: usar `row.filtros_drill` e parar de inferir colunas

`src/components/bi/drill/ComercialDrillDrawer.tsx`

- `handlePushFromRow(next, row)` passa a ser:

```ts
const rowFilters = (row.filtros_drill ?? {}) as DrillContexto;
// Fallback compatível com backend antigo: só a chave do drill atual
if (!row.filtros_drill && cur) {
  const k = ROW_TO_CTX_KEY[cur.drill_type];
  if (k && row[k] != null) rowFilters[k] = String(row[k]);
}
stack.pushDrill(next, rowFilters);
```

- Remover o `forEach` que copiava `cd_nf/cd_produto/cd_cliente/cd_estado/cd_rev_pedido/anomes_emissao` da linha — era a fonte principal do bug.
- Botão **"Trocar drill"** chama `stack.pushDrill(dt, {}, { mergeWithCurrent: true })` (não soma nada novo, apenas filtra incompatíveis).
- Nos chips de filtros aplicados (já existem), cada chip ganha um `×` que chama `stack.removeContextKey(key)`. Os chips fixos "Unidade" e "Período" continuam sem botão.

### 4. Estado vazio com diagnóstico

Novo componente `src/components/bi/drill/DrillEmptyDiagnostico.tsx`:

- Renderiza quando `resp.rows.length === 0`.
- Se `resp.diagnostico` existe: tabela compacta com `qtd_linhas_base → após_unidade → após_mes → após_cliente → após_uf → após_revenda → após_produto`, destacando o primeiro passo que zerou.
- Lista de botões dinâmicos baseados em `cur.contexto`:
  - "Remover Cliente" (se `cd_cliente`)
  - "Remover Produto" (se `cd_produto`)
  - "Remover Revenda" (se `cd_rev_pedido`)
  - "Remover UF" (se `cd_estado`)
  - "Voltar nível anterior" → `stack.pop()` (desabilitado se nível 1).
- Mensagem: **"Não existem registros para esta combinação de filtros."**
- Se não houver diagnóstico no payload, mostra só a mensagem + botões de remoção (compatibilidade com backend antigo).

O drawer substitui o `<EmptyState description="Sem registros para o contexto atual" />` por `<DrillEmptyDiagnostico stack={stack} response={resp} />`.

### 5. Pequenos cuidados

- **Produto**: nada a fazer no normalize — `comercialDrillApi.cleanContexto` já preserva o valor cru como string, então `1-200000003` vai inteiro. Adicionar um comentário/teste mental para não strippar prefixo.
- O `levelTitle` do breadcrumb continua igual.
- Sem mudanças em `ComercialPage.tsx` (handlers de KPI/gráficos continuam abrindo o drill com `openWith`, que já parte de stack zerada).
- Sem mudanças no backend, edge functions, schema ou `.env`.

---

## Arquivos

**Editar**
- `src/lib/bi/comercialDrillApi.ts` — campos opcionais `filtros_drill` por row e `diagnostico` na resposta.
- `src/lib/bi/comercialDrillCatalog.ts` — `ALLOWED_CTX_KEYS` + helper `mergeCtx`.
- `src/hooks/useComercialDrillStack.ts` — `pushDrill` com `opts`, `removeContextKey`, `replacePath`, uso de `mergeCtx`.
- `src/components/bi/drill/ComercialDrillDrawer.tsx` — usa `row.filtros_drill`, botão "Trocar drill" sem injetar contexto novo, chips com `×`, render do diagnóstico.

**Criar**
- `src/components/bi/drill/DrillEmptyDiagnostico.tsx`.

**Não tocar**
- FastAPI, `supabase/`, `.env`, `src/integrations/supabase/*`, demais consumidores de drill (compras/produção).

---

## Critérios de aceite

- Drill Mensal de GENIUS/202601 traz dados (não inventa `cd_cliente`).
- Drill Cliente partindo de 202601 mostra apenas clientes presentes naquele mês.
- Clicar em "Trocar drill" não cria filtros novos; apenas troca o tipo e mantém só filtros compatíveis.
- Breadcrumb chips têm `×` para remover qualquer filtro individual.
- Combinação vazia mostra mensagem + tabela do diagnóstico (quando o backend mandar) + botões "Remover Cliente / Produto / Revenda / UF" e "Voltar nível anterior".
- `cd_produto = 1-200000003` é enviado inteiro à FastAPI, sem perder o prefixo `1-`.
- Nenhum nível profundo retorna vazio sem mostrar diagnóstico ou ações de recuperação.

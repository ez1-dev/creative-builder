## Objetivo

Corrigir o card "Ranking de revendas" (e todos os outros rankings/séries/donuts do BI Comercial) para exibir o label correto da dimensão — não mais o código cru `202601` nem `anomes_emissao`. A regra de prioridade já existe em `pickDimensionLabel` (`src/lib/bi/dimensionLabels.ts`); o problema é que `ComercialPage.tsx` ainda usa o adapter genérico antigo `pickComercialLabel`, que não amarra a linha à dimensão correta e cai em qualquer chave disponível.

## O que muda

Apenas frontend/apresentação. Nenhum endpoint, nenhuma migration, nenhuma alteração em `filtros_drill` (continua só com códigos crus).

### 1. `src/pages/bi/ComercialPage.tsx` — trocar `pickComercialLabel` por `pickDimensionLabel` com a dimensão certa em cada bloco

| Bloco (memo) | Dimensão | Mudança |
|---|---|---|
| `donutMix` | n/a (categoria custom) | manter `pickComercialLabel(m, ['categoria'])` |
| `estadosSerie` | `estado` | `label: pickDimensionLabel(d, 'estado')` (fallback já cai em `formatEstadoLabel`) |
| `mapaData.uf` | continua só a sigla (mapa precisa de UF de 2 letras) | sem mudança |
| `revendaRank` | `revenda` | `label: pickDimensionLabel(r, 'revenda')` |
| `obrasRank` | `obra` | `label: pickDimensionLabel(o, 'obra')` |

Importa `pickDimensionLabel` de `@/lib/bi/dimensionLabels`.

### 2. `src/lib/bi/dimensionLabels.ts` — alinhar fallback à regra pedida

A regra do usuário é estrita:

```
revenda_label || `${cd_rev_pedido} - ${nm_revenda}` || nm_revenda || cd_rev_pedido
```

A implementação atual já segue essa ordem (`*_label` → `code - name` → `name` → `code`), mas faltam dois ajustes pontuais:

- `obra`: adicionar `cd_obra` na lista de `codeKeys` (hoje só lê `cd_prj`/`cd_projeto`/`numero_projeto`).
- Garantir a prioridade do `serie_label` para nomes de séries: adicionar `'serie_label'` no topo de **todas** as `labelKeys` de cada dimensão (cliente, revenda, estado, obra, produto). Isto cobre o requisito "para gráficos com série, `serie_label` deve ser usado antes de `serie`".

### 3. `src/lib/bi/comercialSeriesBuilder.ts` — usar adapter por dimensão também onde ainda há fallback velho

Hoje `buildEstadoSerie`, `buildRevendaSerie`, `buildObrasSerie` já chamam `pickDimensionLabel`, mas caem em `pickLabel(..., LABEL_KEYS)` se vazio. Trocar o fallback final por:

- `buildEstadoSerie` → fallback `formatEstadoLabel(r.cd_estado ?? r.uf ?? r.sg_uf)`.
- `buildRevendaSerie` / `buildObrasSerie` → fallback `String(cd_rev_pedido ?? cd_prj ?? '—')`.

Isso elimina a chance do builder cair em `anomes_emissao` (que estava acidentalmente no array `ESTADO_LABEL_KEYS` antigo).

`buildSerieFromDrill` (drills CLIENTE/PRODUTO/NF) também passa a usar `pickDimensionLabel(r, dim)` quando a dimensão é mapeável (`CLIENTE`→`cliente`, `PRODUTO`→`produto`, `REVENDA`→`revenda`, `ESTADO`→`estado`), com fallback para `pickLabel` nos drills que não têm dimensão visual definida (NF, DETALHES_IMPOSTOS).

### 4. Confirmar comportamento — sem mudanças no contrato de drill

- `filtros_drill` continua exclusivamente com códigos (`cd_rev_pedido`, `cd_estado`, `cd_prj`, `cd_cliente`, `cd_produto`).
- `extractDrillCtx` / `compactDrillContext` permanecem inalterados.
- O label nunca entra em `filtros_drill`.

## Por que o ranking mostra `202601, 202605, ...`

Esse é literalmente o valor de `cd_rev_pedido` que o backend devolve para a unidade GENIUS — a numeração interna da revenda nesse ERP coincide com algo que parece anomes. Como a tabela `bi_revenda` ainda não foi populada pelo backend (endpoint `POST /api/bi/comercial/revendas/sincronizar` ainda não foi chamado / implementado), o backend não está enviando `nm_revenda` nem `revenda_label`. Resultado: `pickDimensionLabel` legitimamente cai no código.

**Após este ajuste**: o card vai exibir o código até a sincronização de revendas rodar; quando o backend passar a enviar `nm_revenda`/`revenda_label`, automaticamente vira `"202601 - Nome da Revenda"` sem nenhuma mudança extra no frontend.

## Fora de escopo

- Implementar o endpoint backend de sincronização (já documentado em `docs/backend-bi-comercial-revendas-sincronizar.md`).
- Mudar layout, cores, ordenação ou regras de cross-filter.
- Mexer no Drawer de drill — já foi feito no turno anterior.

## Arquivos tocados

- `src/pages/bi/ComercialPage.tsx` — 4 substituições pontuais nos memos `estadosSerie`, `revendaRank`, `obrasRank` (donut/mix mantém categoria).
- `src/lib/bi/dimensionLabels.ts` — adicionar `serie_label` no topo de cada `labelKeys` e `cd_obra` em `obra.codeKeys`.
- `src/lib/bi/comercialSeriesBuilder.ts` — ajustar fallback final dos builders por dimensão e passar a usar `pickDimensionLabel` em `buildSerieFromDrill` quando aplicável.

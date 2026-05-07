
## Contexto

Os endpoints `/api/painel-compras` e `/api/painel-compras-dashboard` ficam no **backend FastAPI externo** (via ngrok), fora deste repositório. A correção definitiva — fazer o dashboard aplicar os mesmos filtros e a mesma derivação de `tipo_despesa` que a lista — precisa ser feita pelo time do backend.

O que está sob nosso controle aqui:

1. **Especificar com precisão** o contrato esperado em `docs/backend-painel-compras-dashboard.md`, incluindo as regras de derivação de `tipo_despesa` / `projeto_macro` que hoje vivem só no frontend (`src/lib/comprasClassificacao.ts`).
2. **Voltar a enviar** `tipo_despesa`, `projeto_macro`, `mes_competencia` e `condicao_pagamento` para os dois endpoints (atualmente o front está removendo esses campos do payload como workaround).
3. **Manter o fallback client-side** já implementado em `kpisGerencial` / `gerencialCharts` / `kpis` enquanto o backend não publicar a versão nova — assim, se o backend ainda não conhecer o filtro, recalculamos localmente a partir de `dadosFiltrados` e os cards continuam corretos.

## Plano

### 1. `docs/backend-painel-compras-dashboard.md` — especificação para o backend

Substituir a nota atual ("esses filtros são client-side") por uma seção **CRÍTICA** exigindo paridade lista x dashboard, e documentar:

- Tabela de chaves canônicas vs labels aceitos para `tipo_despesa`:
  - `MATERIA_PRIMA` ↔ Matéria-prima (aceitar variações com/sem acento, hífen, underscore, caixa).
  - `USO_CONSUMO` ↔ Uso e consumo.
  - `DESPESAS_GERAIS` ↔ Despesas gerais.
  - `SERVICOS` ↔ Serviços.
- Regras de derivação server-side de `tipo_despesa_calc` (mesma lógica de `getTipoDespesa`):
  1. Se ERP já tem `tipo_despesa` → normaliza.
  2. `tipo_item ∈ {SERVICO,S}` → `SERVICOS`.
  3. `descricao_item` contém EPI/FERRAMENTA/MANUTEN/CONSUMO/etc. → `USO_CONSUMO`.
  4. `origem_material`/`codigo_familia`/`descricao_item` contém ACO/AÇO/CHAPA/PERFIL/etc. → `MATERIA_PRIMA`.
  5. default → `DESPESAS_GERAIS`.
- Regras de `projeto_macro` (mesma lógica de `getProjetoMacro`): `numero_projeto >= 600` → ESTRUTURAL ZORTEA; origens {110…250} → GENIUS; etc.
- `mes_competencia`: filtro por `SUBSTRING(COALESCE(mes_competencia,data_emissao,data_recebimento),1,7) = :mes`.
- `condicao_pagamento`: casa (case-insensitive contains) contra código OU descrição.
- `somente_pendentes=true` → `WHERE saldo_pendente > 0` em **ambos** os endpoints.
- Exigência: a coluna calculada `tipo_despesa_calc` deve ser materializada na CTE base, para que tanto o `WHERE` quanto os `GROUP BY` (`por_tipo_despesa`) usem a mesma classificação.

### 2. `src/pages/PainelComprasPage.tsx` — voltar a enviar os filtros

Em `buildParams()` (linhas 170-176), substituir o bloco que **deleta** os campos por um bloco que apenas remove valores vazios/sentinelas, igual aos demais filtros:

```ts
if (!params.projeto_macro || params.projeto_macro === 'TODOS') delete params.projeto_macro;
if (!params.tipo_despesa || params.tipo_despesa === 'TODOS') delete params.tipo_despesa;
if (!params.mes_competencia) delete params.mes_competencia;
if (!params.condicao_pagamento) delete params.condicao_pagamento;
```

Assim o backend novo (com a especificação acima implementada) passa a receber o filtro e devolver agregados consistentes com a lista.

### 3. Manter o fallback client-side (sem mudanças)

`kpisGerencial`, `gerencialCharts` e o useMemo `kpis` já recalculam localmente quando `gerencialActive` é true. Esse caminho continua funcionando como **rede de segurança**: enquanto o backend não publicar a versão nova, o frontend ainda mostra os números certos somando `dadosFiltrados`.

Quando o backend implementar a especificação, esse fallback simplesmente deixa de ser exercitado (porque `dashboard.kpis` já virá filtrado corretamente) — não precisa remover nada.

### 4. Comunicação ao time de backend

Sinalizar ao time que a doc atualizada em `docs/backend-painel-compras-dashboard.md` agora exige paridade lista x dashboard e que devem implementar a derivação `tipo_despesa_calc` na CTE base.

## Arquivos afetados

- `docs/backend-painel-compras-dashboard.md` (especificação completa)
- `src/pages/PainelComprasPage.tsx` (reativa envio de `tipo_despesa` / `projeto_macro` / `mes_competencia` / `condicao_pagamento`)

## Resultado esperado

- **Hoje (antes do backend atualizar):** cards e gráficos continuam corretos via fallback client-side (já em vigor).
- **Depois do backend atualizar:** mesmos cards e gráficos passam a vir do agregado server-side, sem amostragem e sem teto de 50k linhas, refletindo 100% da base filtrada — exatamente o comportamento que você descreveu.

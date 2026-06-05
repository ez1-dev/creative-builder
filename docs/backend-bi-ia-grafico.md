# Endpoint FastAPI — BI Comercial: Gráfico IA (modelo híbrido)

Fluxo:

1. Cloud (edge function `bi-ia-chart`) interpreta o prompt em PT-BR via Lovable AI e devolve um **spec estruturado** (sem SQL).
2. Frontend envia o spec para este endpoint.
3. FastAPI **valida**, consulta a base segura no ERP, agrega e devolve as séries prontas.
4. Frontend renderiza o gráfico e suporta drill (clique → reaplica filtros + dimensão).

Service role **não** sai do Cloud. IA **nunca** gera SQL. FastAPI **revalida** os enums antes de montar a query.

---

## Endpoint

```
POST /api/bi/comercial/ia-grafico
```

Auth: Bearer token (igual aos demais).
Headers: `Content-Type: application/json`, `ngrok-skip-browser-warning: true`.

### Request body

A FastAPI agora recebe **dois formatos**:

**Formato A — prompt cru (preferido)**: o frontend envia o texto do usuário + filtros base do dashboard. A FastAPI interpreta, monta o spec internamente e executa.

```json
{
  "prompt": "Crie um gráfico de rosca mostrando o faturamento total separado por Peças e Serviços, com percentual e valor em reais.",
  "anomes_ini": "202601",
  "anomes_fim": "202612",
  "unidade_negocio": "CONSOLIDADO"
}
```

**Formato B — spec estruturado (compatibilidade)**: usado quando a interpretação é feita fora (ex.: edge function `bi-ia-chart`).

```json
{
  "titulo": "Faturamento por Categoria",
  "subtitulo": "Peças vs Serviços",
  "tipo_grafico": "donut",
  "metrica": "faturamento",
  "dimensao": "categoria_custom",
  "categorias": ["PEÇAS", "SERVIÇOS"],
  "filtros": { "unidade_negocio": "CONSOLIDADO" },
  "top_n": 10,
  "mostrar_percentual": true,
  "mostrar_valor": true
}
```

### Whitelists obrigatórias (revalidar no backend; 400 se fora)

- `tipo_grafico`: `donut | pie | bar | line`
- `metrica`: `faturamento | faturamento_liquido | impostos | devolucao | quantidade | clientes | vendas | ticket_medio | preco_medio`
- `dimensao`: `anomes_emissao | unidade_negocio | cd_origem | cd_tp_movimento | cd_estado | cd_cliente | cd_prj | cd_rev_pedido | cd_tns | categoria_custom`
- `filtros`: aceitar **apenas** chaves da whitelist de dimensões reais (não inclui `categoria_custom`). Qualquer outra chave → ignorar.
- `categorias`: lista de strings, usada apenas quando `dimensao = "categoria_custom"`. Default: `["PEÇAS", "SERVIÇOS"]`.
- `top_n`: clamp em `[3, 30]` (default 10).
- `mostrar_valor`: boolean (default `true`). Frontend usa para decidir se mostra rótulo de valor além do percentual.

---

## Interpretação do prompt (Formato A)

Regras obrigatórias ao traduzir o texto do usuário em spec:

### `unidade_negocio`

- Prompt menciona **"Genius"** → `filtros.unidade_negocio = "GENIUS"`.
- Prompt menciona **"Estrutural"** ou **"Zortea"** → `filtros.unidade_negocio = "ESTRUTURAL ZORTEA"`.
- Prompt menciona **"total"**, **"consolidado"** ou **"geral"**, ou **não menciona unidade nenhuma** → `filtros.unidade_negocio = "CONSOLIDADO"` → **não aplicar filtro de unidade** no SQL.
- O `unidade_negocio` do body (filtro base do dashboard) só é aplicado quando for diferente de `"CONSOLIDADO"` **e** o prompt não pediu explicitamente outra unidade ou usou "total".
- **Nunca** forçar `GENIUS` por padrão.

### Categoria Peças/Serviços

- Prompt menciona "peças e serviços", "peças vs serviços", "categoria", "tipo (peças/serviços)" → `dimensao = "categoria_custom"`, `categorias = ["PEÇAS", "SERVIÇOS"]`.

### Normalização textual

Toda comparação de strings em `cd_origem`, `cd_tp_movimento`, `unidade_negocio` etc. deve usar:

```sql
upper(trim(coalesce(<campo>, '')))
```

---

## Cálculo


---

## Cálculo

Fonte: mesma view/CTE de faturamento já usada pelo BI Comercial (consolidado de `VM_FATURAMENTO`).

### Dimensão `categoria_custom`

Quando `dimensao = "categoria_custom"`, agregar usando o `CASE` normalizado:

```sql
case
  when upper(trim(coalesce(cd_origem, ''))) like 'PE%' then 'PEÇAS'
  when upper(trim(coalesce(cd_origem, ''))) like 'SERV%'
    or upper(trim(coalesce(cd_tp_movimento, ''))) like 'SERV%' then 'SERVIÇOS'
  else 'OUTROS'
end as categoria
```

Manter apenas labels presentes em `categorias` (default `["PEÇAS", "SERVIÇOS"]`). Linhas classificadas como `OUTROS` são descartadas salvo se `"OUTROS"` constar em `categorias`.

`filtros_drill` para cada série de `categoria_custom`: `null` (drill cruzado fica responsabilidade do frontend, que pode reaplicar filtro base + escolher a próxima dimensão).

### Demais dimensões

Agregações por `dimensao` (faturamento e variantes):

| Métrica | Expressão |
|---|---|
| `faturamento` | `SUM(vl_bruto)` |
| `faturamento_liquido` | `SUM(vl_liquido)` |
| `impostos` | `SUM(impostos)` |
| `devolucao` | `SUM(vl_devolucao)` |
| `quantidade` | `SUM(qtd_produtos)` |
| `vendas` | `COUNT(DISTINCT id_nf)` |
| `clientes` | `COUNT(DISTINCT cd_cliente)` |
| `ticket_medio` | `SUM(vl_bruto) / NULLIF(COUNT(DISTINCT id_nf), 0)` |
| `preco_medio` | `SUM(vl_bruto) / NULLIF(SUM(qtd_produtos), 0)` |

Filtros: aplicar como `WHERE upper(trim(coalesce(<coluna>, ''))) = upper(trim(<valor>))` para cada chave do `filtros`. **Exceção**: quando `filtros.unidade_negocio = "CONSOLIDADO"`, **não** aplicar filtro de unidade.

Ordenação:
- Se `dimensao = anomes_emissao` → ordenar por label ascendente (cronológico).
- Demais dimensões → ordenar por `valor DESC`.

Top N:
- Para dimensões não temporais (exceto `categoria_custom`), manter os top N e somar o restante em um bucket `"Outros"` (sem `filtros_drill`).
- Para `anomes_emissao` e `categoria_custom`, não agrupar em "Outros".

---

## Response

```json
{
  "titulo": "Faturamento por Categoria",
  "subtitulo": "Peças vs Serviços",
  "tipo_grafico": "donut",
  "metrica": "faturamento",
  "dimensao": "categoria_custom",
  "mostrar_percentual": true,
  "mostrar_valor": true,
  "total": 1234567.89,
  "filtros": { "unidade_negocio": "CONSOLIDADO" },
  "series": [
    { "label": "PEÇAS",    "valor": 800000.0,  "percentual": 64.8, "filtros_drill": null },
    { "label": "SERVIÇOS", "valor": 434567.89, "percentual": 35.2, "filtros_drill": null }
  ],
  "diagnostico": {
    "linhas_view": 12453,
    "filtros_aplicados": { "anomes_ini": "202601", "anomes_fim": "202612" },
    "unidade_negocio": "CONSOLIDADO",
    "periodo": { "ini": "202601", "fim": "202612" },
    "dimensao": "categoria_custom"
  }
}
```

Regras:
- `percentual` = `valor / total * 100` (0 quando `total = 0`).
- `filtros_drill` = `filtros ∪ { [dimensao]: label }`. Para o bucket `"Outros"` e para `categoria_custom`, retornar `null`.
- Devolver `titulo` e `subtitulo` exatamente como recebidos (ou gerados pela interpretação no Formato A).
- **Sempre** incluir o bloco `diagnostico` (também em sucesso) para permitir auditoria no frontend.

---

## Erros e resultado vazio

- `400` — payload inválido (enum fora da whitelist, body malformado, prompt vazio).
- `401/403` — auth.
- **Resultado vazio**: **NÃO retornar 422**. Retornar `200` com `series: []`, `total: 0` e o bloco `diagnostico` preenchido (linhas na view, filtros aplicados, unidade, período, dimensão). O frontend usa esse bloco para mostrar diagnóstico amigável no lugar do gráfico em branco.
- `5xx` — `{ "error": "...", "code": "INTERNAL_ERROR" }`.

---

## Notas de segurança

- **Nunca** aceitar SQL livre vindo do body.
- **Nunca** usar string interpolation com `filtros` direto na query — usar parâmetros nomeados.
- Logar requests rejeitados por whitelist (possível tentativa de bypass).
- Logar o spec interpretado quando o body for Formato A (prompt cru), incluindo `unidade_negocio` final, para auditoria.


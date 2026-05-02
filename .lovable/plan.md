## Fix: Painel de Compras — backend rejeita CSV em `situacao_oc`

### Problema

Backend respondeu:
```
situacao_oc: Input should be a valid integer, unable to parse string as an integer
```

Ou seja, ele faz `int(situacao_oc)` direto. Quando o frontend envia `1,2,3` (CSV), o request quebra com 422. A mitigação client-side que escrevi assumia que o backend devolveria os dados (mesmo que sem filtrar), mas na verdade a chamada nem completa.

### Correção

Em `src/pages/PainelComprasPage.tsx`, ajustar o tratamento de `situacao_oc` em **dois pontos** (`search` e `exportParams`):

- **0 selecionadas** → omite o parâmetro (= todas) — já funciona.
- **1 selecionada** → envia valor único (ex: `situacao_oc=4`) — já funciona.
- **2+ selecionadas** → **omite o parâmetro** (em vez de mandar CSV) e mantém o filtro **client-side** já existente (`MITIGACAO_SITUACAO_OC_MULTI`).

A mitigação já filtra `data.dados` local e exibe o `toast.warning` único avisando o usuário. Isso permanece como está.

#### Patch — bloco do `search` (~linhas 106-110)

```ts
// situacao_oc: backend só aceita INT único hoje (ver docs/backend-painel-compras-situacao-multi.md).
// - 0 selecionadas → omite (todas)
// - 1 selecionada → envia valor único
// - 2+ selecionadas → omite e filtra client-side abaixo (MITIGACAO_SITUACAO_OC_MULTI)
const situacoesSel: string[] = Array.isArray(params.situacao_oc) ? params.situacao_oc : [];
if (situacoesSel.length === 1) params.situacao_oc = situacoesSel[0];
else delete params.situacao_oc;
```

#### Patch — bloco do `exportParams` (~linhas 446-449)

Mesmo tratamento: omite quando `length !== 1`.

```ts
const sitsSel: string[] = Array.isArray(p.situacao_oc) ? p.situacao_oc : [];
if (sitsSel.length === 1) p.situacao_oc = sitsSel[0];
else delete p.situacao_oc;
```

> **Observação sobre exportação**: com 2+ situações, o CSV exportado vai trazer **todas as situações** (porque o backend é quem gera o arquivo, sem suporte a multi-situação). Vou adicionar um `toast.info` no clique de exportar avisando o usuário a baixar e filtrar localmente, **ou** desabilitar o botão de Export quando houver 2+ situações marcadas. Sugiro **avisar** (toast) em vez de desabilitar — menos atrito.

### Ajuste no doc backend

Atualizar `docs/backend-painel-compras-situacao-multi.md` deixando explícito que **hoje** o backend faz `int(...)` direto (Pydantic) e que a correção é trocar o tipo do parâmetro para `Optional[str]` + parser CSV (mesmo pseudocódigo já documentado lá). Adicionar um trecho “Status atual: rejeita CSV com 422” para ficar claro.

### Arquivos alterados

- `src/pages/PainelComprasPage.tsx` — 2 blocos pequenos + toast no Export.
- `docs/backend-painel-compras-situacao-multi.md` — nota de status.

Aprova?
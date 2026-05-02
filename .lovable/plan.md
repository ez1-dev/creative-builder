## Backend agora aceita CSV em `situacao_oc` — remover mitigação

O backend foi atualizado: `situacao_oc` agora é `Optional[str]` e aceita `1`, `1,2,3`, etc., aplicando `IN (?, ?, ?)` no SQL. Isso vale também para `/api/export/painel-compras`.

Com isso, toda a mitigação client-side em `src/pages/PainelComprasPage.tsx` deixa de ser necessária e passa a ser código morto que pode mascarar bugs (filtra `dados` localmente, deixando `total`/paginação inconsistentes).

### Alterações

#### 1. `src/pages/PainelComprasPage.tsx`

**a) Bloco `search` (linhas ~106-112)** — substituir o tratamento "1 envia, 2+ omite" por envio de CSV:

```ts
// situacao_oc: backend aceita CSV (ex.: "1" ou "1,2,3").
const situacoesSel: string[] = Array.isArray(params.situacao_oc) ? params.situacao_oc : [];
if (situacoesSel.length > 0) params.situacao_oc = situacoesSel.join(',');
else delete params.situacao_oc;
```

**b) Remover bloco `MITIGACAO_SITUACAO_OC_MULTI` (linhas ~160-177)** — apaga o filtro client-side, o `toast.warning` e a flag `__avisouSituacaoMultiBackend`. Agora o backend devolve dados/total/paginação corretos.

**c) Bloco `exportParams` (linhas ~448-450)** — mesmo tratamento do `search`:

```ts
const sitsSel: string[] = Array.isArray(p.situacao_oc) ? p.situacao_oc : [];
if (sitsSel.length > 0) p.situacao_oc = sitsSel.join(',');
else delete p.situacao_oc;
```

**d) Remover wrapper `onClickCapture` do `ExportButton` (linhas ~528-538)** — o `toast.info` "Exportação trará todas as situações" não faz mais sentido. Restaura para:

```tsx
actions={<ExportButton endpoint="/api/export/painel-compras" params={exportParams} />}
```

#### 2. `docs/backend-painel-compras-situacao-multi.md`

Marcar como **resolvido**: backend aceita CSV; frontend envia `situacao_oc=1,2,3`; mitigação removida.

#### 3. `.lovable/plan.md`

Substituir pelo registro curto desta correção (fix aplicado, doc atualizado).

### Fora de escopo

- `MITIGACAO_TIPO_ITEM` (linhas ~120-158) permanece — é problema diferente (`tipo_item=SERVICO` sem acento), não relacionado a esta correção.
- `ExportButton` em si não muda; ele já serializa arrays via `appendValue`, mas como mandamos string CSV pronta, o comportamento fica explícito e idêntico ao `search`.

### Validação

- Build TS limpa.
- Manual no preview (após deploy): selecionar 2+ situações → request deve ir com `situacao_oc=1,2,3`, `total` e paginação coerentes, exportação respeita o filtro.
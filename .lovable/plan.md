
## Objetivo

1. Drill por Cliente exibir `cd_cliente - nm_cliente` em vez de só o código.
2. Corrigir o breadcrumb que hoje rotula filtros herdados com o nome do drill atual (ex.: "Cliente: PA" quando PA é UF).

Mudanças concentradas no frontend; documento separado descreve o ajuste necessário na FastAPI/RPC.

---

## 1. Backend (documentado, não implementado pelo Lovable)

Criar `docs/backend-bi-comercial-drill-cliente-nome.md` especificando para o time da FastAPI:

- Verificar na view `public.v_bi_faturamento_comercial` se existe coluna de nome do cliente (`nm_cliente` / `ds_cliente` / `nome_cliente`).
- Se não existir, adicionar `nm_cliente` à view (preferência) ou fazer JOIN com a dimensão de cliente no SQL do drill.
- Na rota `POST /api/bi/comercial/drill`, para `drill_type = "CLIENTE"`:
  - `columns` deve incluir `{ key: "cliente_label", label: "Cliente" }` no lugar (ou além) de `cd_cliente`.
  - Cada `row` deve devolver:
    ```json
    {
      "cd_cliente": "8794",
      "nm_cliente": "NOME DO CLIENTE",
      "cliente_label": "8794 - NOME DO CLIENTE",
      "filtros_drill": { "cd_cliente": "8794" }
    }
    ```
  - `filtros_drill` continua usando **somente** `cd_cliente` — nunca o label.
- Mesma ideia aplicável (futuramente) a Revenda/Produto, mas fora do escopo deste pedido.

Esse arquivo é apenas contrato — nenhuma migration ou edge function é alterada.

---

## 2. Frontend — breadcrumb correto

Hoje `ComercialDrillDrawer.levelTitle` faz:

```
label = DRILL_LABELS[level.drill_type]
+ ": " + primeiro valor não vazio do contexto
```

Resultado: nível "CLIENTE" com contexto `{ cd_estado: "PA" }` vira `"Cliente: PA"`.

### Correção

Calcular o rótulo do nível a partir do **filtro adicionado naquele push**, não do drill atual.

- Em `useComercialDrillStack.ts`:
  - Estender `DrillStackLevel` com `addedFilter?: { key: keyof DrillContexto; value: string }`.
  - Em `pushDrill`, comparar `newCtx` x `cur.contexto` e gravar a primeira chave nova (ou alterada) em `addedFilter`. Se nenhuma chave nova entrar (caso "Trocar drill"), `addedFilter` fica `undefined`.
  - `openWith` e `replacePath`: gravar `addedFilter` a partir dos filtros iniciais informados, se houver.

- Em `ComercialDrillDrawer.tsx` (`levelTitle`):
  - Nível 0: `DRILL_LABELS[drill_type]` (ex.: "Acumulado").
  - Demais níveis:
    - Se `addedFilter` existir: rótulo = `"${CTX_LABELS[key]}: ${value} › ${DRILL_LABELS[drill_type]}"`
      simplificado para o requisito: cada nível mostra o **filtro herdado** dele e o **nome do drill atual** vira apenas o último item.
    - Implementação prática: para níveis intermediários exibir `"${CTX_LABELS[addedFilter.key]}: ${addedFilter.value}"`; para o último nível exibir `DRILL_LABELS[drill_type]` puro.
  - Resultado para o cenário do bug:
    `Acumulado › Estado: PA › Cliente` (último item é o drill atual sem valor).

- Chips de contexto (`chips` no Drawer) já usam `CTX_LABELS[k]` corretamente; nada a mudar lá.

---

## 3. Frontend — coluna Cliente com código + nome

- `src/lib/bi/comercialDrillApi.ts`:
  - Estender `DrillRow` com campos opcionais `nm_cliente?: string` e `cliente_label?: string` (apenas tipagem; aceita o que o backend mandar).

- `src/components/bi/drill/ComercialDrillDrawer.tsx`:
  - No `useMemo` de `columns`, depois de mapear `resp.columns`, aplicar fallback de render para a coluna `cd_cliente` quando o drill atual for `CLIENTE`:
    - Se a linha tem `cliente_label`, renderiza ele.
    - Senão, se tem `nm_cliente`, renderiza `"${cd_cliente} - ${nm_cliente}"`.
    - Senão, mantém o valor atual.
  - O cabeçalho passa a ser "Cliente" (já vem do backend) — sem mudança extra.
  - `handlePushFromRow` continua usando `row.filtros_drill` (que segundo o contrato traz só `cd_cliente`), então o filtro técnico fica intacto.

- CSV: como `downloadDrillCsv` usa `resp.columns` para montar o cabeçalho, ele continuará exportando os campos que o backend declarar. Sem mudança.

---

## 4. Arquivos afetados

- `docs/backend-bi-comercial-drill-cliente-nome.md` (novo, contrato para FastAPI)
- `src/hooks/useComercialDrillStack.ts` (adicionar `addedFilter` em cada push)
- `src/lib/bi/comercialDrillApi.ts` (tipos `nm_cliente`, `cliente_label`)
- `src/components/bi/drill/ComercialDrillDrawer.tsx` (`levelTitle` novo + render override da coluna cliente)

Sem alterações em Cloud, edge functions ou migrations.

---

## 5. Critério de aceite

- Breadcrumb mostra `Acumulado › Estado: PA › Cliente` (não mais `Cliente: PA`).
- Quando a FastAPI passar a devolver `nm_cliente`/`cliente_label`, a coluna Cliente exibe `8794 - NOME DO CLIENTE`. Enquanto o backend não atualizar, o frontend continua exibindo apenas o código sem quebrar.
- Clicar em "Detalhar" em uma linha de Cliente envia para o próximo drill apenas `cd_cliente`, nunca o label.
- Chips de filtro continuam corretos (`UF: PA`, `Cliente: 8794`).

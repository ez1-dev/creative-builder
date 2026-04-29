## Objetivo

Quando o backend retornar `ops_candidatas: number[]` no `/contexto` (lista de OPs vinculadas ao pedido digitado), o frontend deve mostrar um seletor para o usuário escolher a OP correta. Ao escolher, re-busca o contexto passando `numero_op` da OP selecionada — o mismatch some e os botões "Reservar" / "Vincular" habilitam.

## Mudanças — `src/pages/NumeroSeriePage.tsx`

### 1. Tipo
Adicionar ao `ContextoNumeroSerie`:
```ts
ops_candidatas?: number[];
```

### 2. Card de Contexto — seletor condicional

Logo abaixo do `Alert` âmbar de mismatch (e também quando `ops_candidatas.length > 1` mesmo sem mismatch), renderizar um bloco:

```
[OP correta deste pedido:  ▼ 100234 ] [Aplicar]
   3 OPs candidatas encontradas para o pedido 11510 / item 1.
```

- Usa `Select` do shadcn (`@/components/ui/select`).
- Estado novo: `const [opCandidataEscolhida, setOpCandidataEscolhida] = useState<string>('')`.
- Botão "Aplicar OP" chama uma função `aplicarOpCandidata(numeroOp)` que:
  - Atualiza `filters.numero_op` com a OP escolhida.
  - Re-chama `buscarContexto()` com a OP fixada.
- Se `ops_candidatas.length === 1`, mostrar dica clicável "Aplicar OP única: 100234" sem precisar do Select.

### 3. Mensagem do Alert âmbar
Quando houver `ops_candidatas` não-vazio, complementar o Alert: "Veja abaixo as OPs candidatas e selecione a correta."

Quando `ops_candidatas` estiver vazio/ausente E houver mismatch, manter a mensagem atual (instruir desvincular).

### 4. Reset
- Limpar `opCandidataEscolhida` no `limpar()`.
- Limpar `opCandidataEscolhida` no início de `buscarContexto()`.

## Sem mudanças no backend (apenas consumo)

O contrato já está documentado em `docs/backend-numero-serie-contexto-op-correta.md` (`ops_candidatas: number[]`). Esta entrega só consome o campo.

## Arquivos afetados

- `src/pages/NumeroSeriePage.tsx` — tipo, estado, seletor visual, função `aplicarOpCandidata`.

## Fora de escopo

- Endpoint dedicado `/api/numero-serie/ops-do-pedido` (mencionado como opcional na doc) — fica para depois se for necessário.
- Mostrar metadados extras das OPs (status, qtde) — hoje só temos `number[]`.
## Objetivo

Permitir trocar a OP carregada digitando **outro pedido + item** diretamente no card "Contexto do Pedido / OP", sem precisar limpar tudo e refazer a busca pelos filtros do topo. Isso resolve o caso em que o backend retornou a OP errada (ex.: OP 1111 do pedido antigo 4891) e você quer recarregar o contexto pelo pedido correto (ex.: 11510 / item 1).

## Escopo

Apenas frontend. Arquivo único: `src/pages/NumeroSeriePage.tsx`. Sem mudanças no backend, schema ou design system.

## Implementação

### 1. Estado novo
Dois `useState<string>` para os inputs do trocador:
- `trocarPedido` — número do pedido a aplicar
- `trocarItem` — item do pedido (default `'1'`)

Limpos em `limpar()` e após aplicar com sucesso.

### 2. Função `aplicarPedidoManual()`
Análoga à `aplicarOpCandidata()` que já existe:
- Valida que `trocarPedido` é número > 0
- Atualiza `filters` zerando `numero_op` e setando `numero_pedido` + `item_pedido`
- Reseta `opCandidataEscolhida` e `contexto`
- Chama `api.get('/api/numero-serie/contexto', { numero_pedido, item_pedido, codigo_empresa })`
- Em sucesso: `setContexto(result.contexto)`, dispara `buscarProximos` se houver `codigo_produto`
- Em erro: toast com a mensagem
- Sempre `setLoading(false)` no `finally`

### 3. UI no card de Contexto
Novo bloco logo abaixo do bloco existente de "OPs candidatas" (linha ~575), com mesmo estilo visual (border primário, fundo `primary/5`):

```text
┌─ Trocar contexto por outro pedido ──────────────┐
│ [Pedido______] [Item__] [ Aplicar Pedido ]      │
└─────────────────────────────────────────────────┘
```

- 2 `Input` pequenos (`h-8 text-xs`) + 1 `Button` (`size="sm"`)
- Label discreta acima: "Trocar contexto por outro pedido"
- Botão desabilitado quando `loading` ou `trocarPedido` vazio
- `Enter` no input dispara `aplicarPedidoManual()`

### 4. Sem regressão
- Não altera nada no fluxo de filtros do topo, no seletor de OPs candidatas, na detecção de mismatch, na validação de origem, nem nos botões Reservar/Vincular/Desvincular.
- Não toca em `buscarContexto`, `buscarProximos`, `desvincular`, `reservar`, `vincular`.

## Resultado esperado

No seu cenário atual (OP 1111 carregada, pedido vinculado 4891 mostrado), você digita `11510` em Pedido, `1` em Item, clica **Aplicar Pedido** e o card recarrega com a OP que o backend devolver para o pedido 11510 — habilitando Reservar/Vincular se não houver mismatch.

## Arquivos modificados

- `src/pages/NumeroSeriePage.tsx` (estado + função + bloco JSX no card de Contexto)

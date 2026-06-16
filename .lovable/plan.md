## Objetivo

Alinhar a seção "OP Complementar — Manter GS" (`src/pages/NumeroSeriePage.tsx`) à regra real: o usuário escolhe um **GS existente** e vincula esse GS a uma OP nova complementar **origem 250 / situação L**, para que, ao finalizar a OP no Senior, o produto acabado entre em estoque reutilizando esse mesmo GS. A rotina nunca gera nem busca próximo GS.

## Mudanças (arquivo único: `src/pages/NumeroSeriePage.tsx`)

### 1. Tornar campos obrigatórios

Hoje "GS original" e "OP original" são opcionais. Passar a exigir:

- **GS original** (`opcNumeroSerie`) — obrigatório. Placeholder muda para `Ex.: GS-11661`. Validação no início de `executarOpComplementar`: se vazio, `toast.error('Informe o GS original a ser reutilizado na nova OP.')`.
- **OP original** (`opcOpOrigem`) — obrigatório. Validação: se vazio, `toast.error('Informe a OP original que possui o GS.')`. Sempre enviar `numero_op_origem: Number(opcOpOrigem)` no payload (remover o spread condicional).
- **Origem da OP original** (`opcOrigemOpOrigem`) — obrigatório, default `250`.

### 2. Origem da OP nova fixa em 250

- Input "Origem da OP nova" passa a ser `readOnly` (mantém visual, `bg-muted`), valor default `250`, e o payload sempre envia `origem_op_nova: '250'`. Texto auxiliar reforça que esta rotina opera **somente origem 250**.

### 3. Payload final

Simular (`/api/numero-serie/op-complementar/simular`) e Executar (`/api/numero-serie/op-complementar/manter-gs`) passam a enviar exatamente:

```json
{
  "codigo_empresa": 1,
  "numero_op_nova": 1113,
  "origem_op_nova": "250",
  "numero_op_origem": 250,
  "origem_op_origem": "250",
  "numero_serie": "GS-11661",
  "justificativa": "...",
  "confirmar": false | true
}
```

Manter `situacao_op_nova: "L"` no body (backend filtra OPs `CODEMP=1 + CODORI=250 + SITORP=L`).

### 4. Mensagem de sucesso padronizada

Após `manter-gs` bem-sucedido (origem/sit. validadas), exibir:

```
GS {numero_serie} vinculado à OP complementar {origem_op_nova}/{numero_op_nova}.
Ao finalizar a OP, o ERP deverá usar esse GS na entrada de estoque do produto acabado.
```

Usar `result.numero_serie || opcNumeroSerie`, `result.origem_op_nova || '250'`, `result.numero_op_nova || opcOpNova`. Se o backend devolver `mensagem`, ainda prevalece o template padrão (regra do usuário).

### 5. Texto auxiliar do card

Atualizar para deixar a regra explícita:

> "Reutiliza um GS já existente em uma OP complementar (CODEMP=1, CODORI=250, SITORP=L). A rotina não gera novo GS — ao finalizar a OP nova no Senior, o produto acabado entra em estoque com o mesmo GS informado."

### 6. Validação de resposta (já existe)

Manter o bloqueio quando `result.origem_op_nova !== '250'` ou `result.situacao_op_nova !== 'L'` com a mensagem:
> "A rotina permite somente OP complementar da origem 250 com situação Liberada."

## Fora de escopo

- Backend FastAPI (já deve filtrar por `CODEMP+CODORI+SITORP` e aceitar o payload acima).
- Outras seções (Reservar, Vincular, Desvincular, filtros gerais).
- Lovable Cloud / Supabase — sem mudanças.

## Validação

- Build TS verde.
- Network do "Simular" / "Manter GS" mostra o payload exato acima.
- Submeter sem GS ou sem OP original bloqueia com toast.
- Sucesso exibe a mensagem padronizada com `GS-XXXX vinculado à OP complementar 250/XXXX...`.

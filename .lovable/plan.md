## Objetivo

Forçar a rotina "OP Complementar — Manter GS" (`src/pages/NumeroSeriePage.tsx`) a tratar apenas OPs `CODEMP=1` + `CODORI=250` + `SITORP=L`, enviando explicitamente `situacao_op_nova: "L"` em todas as chamadas e bloqueando ações quando o backend retornar OP fora dessa regra.

## Mudanças no frontend

Arquivo único: `src/pages/NumeroSeriePage.tsx`.

### 1. Payload de Simular / Manter GS (`executarOpComplementar`)

Adicionar `situacao_op_nova: 'L'` ao body enviado para:
- `POST /api/numero-serie/op-complementar/simular`
- `POST /api/numero-serie/op-complementar/manter-gs`

Demais campos permanecem como já estão (`origem_op_nova`, `origem_op_origem`, etc).

### 2. Busca de contexto da OP nova

Se já existir helper que busca contexto da OP complementar, incluir `situacao_op_nova=L` nos query params. Caso a página hoje não chame `GET /api/numero-serie/op-complementar/contexto`, criar uma chamada leve disparada ao sair do campo "OP nova" (onBlur) que faz:

```
GET /api/numero-serie/op-complementar/contexto
  ?numero_op_nova={opcOpNova}
  &origem_op_nova={opcOrigemOpNova}
  &situacao_op_nova=L
  &numero_op_origem={opcOpOrigem||opcOpNova}
  &origem_op_origem={opcOrigemOpOrigem}
```

A resposta é apenas exibida via toast/alert se vier divergente — sem alterar o restante da UI.

### 3. Validação de resposta

Após `simular` / `manter`:
- Se `result.origem_op_nova` existir e for diferente de `"250"`, ou `result.situacao_op_nova` for diferente de `"L"`, exibir erro destrutivo e não considerar sucesso:
  > "A rotina permite somente OP complementar da origem 250 com situação Liberada."
- Aplicar a mesma validação ao retorno do contexto (item 2).

Adicionar os campos opcionais `origem_op_nova?: string` e `situacao_op_nova?: string` à interface `ResultadoOpComplementar`.

### 4. UX

- Manter os inputs já existentes ("Origem da OP nova" default `250`).
- Não adicionar novo input visível para situação — fixa em `"L"` no payload (o backend é a fonte da verdade; a tela apenas exige).
- Texto auxiliar do card: acrescentar "Somente OPs origem 250 com situação L (Liberada)".

## Fora de escopo

- Backend FastAPI (já deve aplicar o filtro definitivo).
- Outras seções da página (Reservar, Vincular, Desvincular, filtros gerais).

## Validação

- Build TS verde.
- Network do "Simular" mostra `situacao_op_nova: "L"` no body.
- Se backend retornar OP origem ≠ 250 ou situação ≠ L, toast destrutivo aparece com a mensagem padronizada.

## Objetivo

Ajustar a seção "OP Complementar — Manter GS" (`src/pages/NumeroSeriePage.tsx`) para refletir a regra correta: reaproveitar um GS existente em uma OP nova complementar (origem 250, SITORP=L), mesmo que o GS pertença a outro produto/derivação. Adicionar suporte controlado a `forcar_vinculo` e tratar alertas de "GS em outro produto" como aviso (não bloqueio).

## Mudanças (arquivo único: `src/pages/NumeroSeriePage.tsx`)

### 1. Payload — incluir `forcar_vinculo` (default `false`)

No `body` enviado em `simular` e `manter-gs`, adicionar `forcar_vinculo: opcForcarVinculo` (state novo, default `false`). Remover `situacao_op_nova: 'L'` do payload — a validação de SITORP=L é responsabilidade do backend; o frontend apenas valida o que vier na resposta. Payload final:

```json
{
  "codigo_empresa": 1,
  "numero_op_nova": 1113,
  "origem_op_nova": "250",
  "numero_op_origem": 250,
  "origem_op_origem": "250",
  "numero_serie": "GS-11661",
  "justificativa": "...",
  "confirmar": false | true,
  "forcar_vinculo": false
}
```

### 2. Novo state `opcForcarVinculo` (boolean, default `false`)

- Não exibir como checkbox normal. Quando a API devolver erro/aviso indicando "GS não encontrado ativo na USU_T075SEP", abrir um `AlertDialog` ("Este GS não foi encontrado como ativo na USU_T075SEP. Deseja forçar o vínculo mesmo assim?"). Se o usuário confirmar, refazer a chamada com `forcar_vinculo: true` (mantendo `confirmar` do contexto). Caso contrário, abortar.
- Após cada execução bem-sucedida, resetar `opcForcarVinculo` para `false`.

### 3. Tratar "GS pertence a outro produto/derivação" como aviso, não bloqueio

- Estender `ResultadoOpComplementar` com `aviso?: string` e/ou `outro_produto?: boolean` (campos opcionais — backend pode mandar em `aviso`, `mensagem`, ou `conflito`).
- Detectar via heurística no texto retornado (`/outro produto|outra deriva/i`). Quando detectado, **não** mostrar `<Alert variant="destructive">` — exibir como `<Alert>` informativo amarelo com o texto: "GS localizado ativo, porém vinculado a outro produto/derivação. A rotina seguirá como reaproveitamento de GS em OP complementar."
- O campo `opcResultado.conflito` continua sendo destrutivo apenas para conflitos reais (não relacionados a "outro produto").

### 4. Habilitar execução após simulação bem-sucedida

- Novo state `opcSimulacaoOk` (boolean). Setar `true` após `simular` retornar sem erro e com origem/situação válidas. Botão "Manter GS na nova OP" passa a exibir `disabled={!opcSimulacaoOk || opcLoading !== null}`.
- Mensagem de sucesso da simulação muda para: `"GS validado para reaproveitamento na OP complementar. Ao finalizar a OP nova, o ERP deverá usar este GS na entrada de estoque."` (substitui o `result?.mensagem || 'Simulação concluída.'` atual).
- Qualquer mudança nos inputs (`opcOpNova`, `opcOpOrigem`, `opcOrigemOpOrigem`, `opcNumeroSerie`, `opcJustificativa`) invalida `opcSimulacaoOk` (volta a `false`).

### 5. Rótulos da tela

Renomear labels:
- "OP nova" (já está)
- "Origem da OP nova" (já está, mantém readOnly "250")
- "OP original" (já está)
- "Origem da OP original" (já está)
- "GS original" → **"GS existente"**
- "Justificativa" (já está)

Atualizar texto auxiliar do card para refletir a regra correta:
> "Reaproveita um GS existente em uma OP nova complementar (origem 250, SITORP=L). O GS pode pertencer a outro produto/derivação — será usado para acompanhar a OP até a finalização e entrada em estoque."

### 6. Mensagem de execução

Manter a mensagem padronizada já implementada após `manter-gs` (item 4 do plano anterior). Adicionalmente, se houver aviso de "outro produto", concatenar como linha informativa.

## Fora de escopo

- Backend FastAPI (deve continuar filtrando OP por CODEMP+CODORI+SITORP=L e devolver `origem_op_nova`/`situacao_op_nova` na resposta).
- Outras seções da página (Reservar, Vincular, Desvincular, contexto, filtros).
- Lovable Cloud — sem mudanças.

## Validação

- Build TS verde.
- Network: payload exato com `forcar_vinculo: false` por padrão.
- Simulação OK habilita o botão "Manter GS na nova OP" com a mensagem esperada.
- Resposta com "outro produto" exibe aviso amarelo, **não** bloqueia.
- Erro de "GS não encontrado ativo" abre AlertDialog perguntando se força; ao confirmar, refaz com `forcar_vinculo: true`.

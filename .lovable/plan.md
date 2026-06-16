## Objetivo

Ajustar a lógica do "OP Complementar — Manter GS" para reconhecer GS encontrado no histórico do ERP (`E210MVP` / `E210DLS`) como válido — sem exigir `forcar_vinculo=true`. A confirmação extra de "forçar vínculo" passa a ocorrer apenas quando o GS não existe em nenhuma fonte.

Arquivo único: `src/pages/NumeroSeriePage.tsx`.

## Mudanças

### 1. Estender `ResultadoOpComplementar`

Adicionar campos opcionais devolvidos pela API:

```ts
fonte_gs?: string;              // "USU_T075SEP" | "E210MVP" | "E210DLS" | null
gs_existe_historico?: boolean;  // true quando achou em E210MVP/E210DLS
gs_existe?: boolean;            // true se existe em qualquer fonte
```

### 2. Detectar "histórico" e exibir aviso (não bloqueia)

Em `executarOpComplementar`, após receber `result` da simulação/execução:

- Se `result.fonte_gs` for `E210MVP` ou `E210DLS`, OU `result.gs_existe_historico === true`:
  - `setOpcAviso('GS encontrado no histórico do ERP. Ele será reaproveitado e reservado para a OP nova.')`
  - **Não** abrir o `AlertDialog` de forçar vínculo. Seguir o fluxo normal (habilita execução após simular OK).
- Aviso "outro produto/derivação" continua tratado em paralelo (texto: "GS encontrado em produto/derivação diferente. A rotina seguirá como reaproveitamento de GS em OP complementar."). Se ambos forem verdade, exibir os dois (concatenar ou mostrar dois `<Alert>`).

### 3. Disparar "forçar vínculo" apenas quando GS não existe em nenhuma fonte

Hoje o dialog é aberto pela mensagem de erro contendo `/USU_T075SEP|não encontrado ativo/i`. Refinar:

- **Caminho preferido (resposta 200 com flags):** se a API responder sucesso mas com `result.gs_existe === false` e sem `fonte_gs`, abrir o dialog com texto novo: **"Este GS não foi encontrado no ERP. Deseja forçar o vínculo mesmo assim?"**. Não considerar simulação como OK enquanto não houver decisão.
- **Caminho de erro (compatibilidade):** manter o catch atual, mas ampliar o regex para `/não encontrado no ERP|não existe no ERP|gs_existe.*false/i` além do já existente. Se o erro mencionar apenas `USU_T075SEP` mas a resposta paralela indicar histórico, **não** abrir o dialog — confiar nos campos `fonte_gs`/`gs_existe_historico`.

### 4. Mensagens finais

- **Simulação OK** (qualquer fonte válida, incluindo histórico): toast `"GS validado para reaproveitamento na OP complementar. Ao finalizar a OP nova, o ERP deverá usar este GS na entrada de estoque."` (mantém).
- **Execução OK** (`manter-gs`): trocar para o template solicitado:
  > `GS {numero_serie} reservado para a OP nova {origem_op_nova}/{numero_op_nova}. Ao finalizar a OP, o ERP deverá usar esse GS na entrada de estoque.`
- Texto do dialog "Forçar vínculo do GS?" atualizado para: **"Este GS não foi encontrado no ERP. Deseja forçar o vínculo mesmo assim?"** (substitui menção a USU_T075SEP).

### 5. Payload — sem alteração

`forcar_vinculo` continua `false` no fluxo normal; só vira `true` quando o usuário confirma o dialog. Demais campos seguem como já implementados.

### 6. UI do card de resultado

- Quando `fonte_gs` vier preenchido, exibir uma nova linha no grid de "Resultado": `Fonte do GS: <badge>` (ex.: `E210MVP`).

## Fora de escopo

- Backend FastAPI (deve devolver `fonte_gs`, `gs_existe_historico`, `gs_existe`).
- Outras seções da página.
- Lovable Cloud.

## Validação

- Build TS verde.
- Simulação que retorna `fonte_gs: "E210MVP"` exibe aviso amarelo e habilita "Manter GS na nova OP" sem abrir o dialog.
- Simulação com `gs_existe: false` abre o dialog com o novo texto; ao confirmar, refaz com `forcar_vinculo: true`.
- Execução bem-sucedida mostra o toast no formato `GS GS-XXXX reservado para a OP nova 250/XXXX...`.
- Aviso "outro produto/derivação" continua não-bloqueante.

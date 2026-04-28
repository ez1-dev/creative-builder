## Objetivo

Permitir que o usuário **escolha qual GS desvincular** quando o contexto carregado tiver dois GS distintos (um no item do pedido / `E000CSE` e outro reservado para a OP em `USU_T075SEP`). Hoje o frontend prioriza um deles silenciosamente, o que é perigoso.

Premissa: você criará a rota `POST /api/numero-serie/desvincular` no backend FastAPI seguindo o contrato em `docs/backend-numero-serie-desvincular.md` (com o ajuste descrito abaixo).

## Mudanças no frontend — `src/pages/NumeroSeriePage.tsx`

### 1. Detectar candidatos a desvínculo

Construir uma lista `candidatosDesvinculo` derivada do `contexto`:

- **Candidato A — item do pedido**: presente quando `contexto.numero_serie_atual` existe.
  - Escopo: `item_pedido`
  - Pedido/Item: `contexto.numero_pedido` / `contexto.item_pedido`
  - Limpa `E000CSE`: sim
- **Candidato B — vínculo da OP**: presente quando `contexto.numero_serie_vinculada_op` existe.
  - Escopo: `vinculo_op`
  - Pedido/Item: `contexto.pedido_vinculado_op` / `contexto.item_vinculado_op` (já vêm no contexto)
  - Limpa `E000CSE`: não (a menos que seja o mesmo GS de A)
- **Candidato C — manual**: quando `filters.numero_serie_manual` está preenchido.
  - Escopo: `item_pedido` (assume pedido/item dos filtros).

Se A e B apontam para o **mesmo GS**, mostrar como um único candidato.

### 2. Ajustar o `AlertDialog` de confirmação

- Se houver **1 candidato**: comportamento atual (apenas confirma).
- Se houver **2+ candidatos**: mostrar um `RadioGroup` (shadcn) listando cada um com:
  - GS, escopo (`Item do pedido` / `Vínculo da OP`), pedido/item afetado.
  - Texto explicativo curto.
- O botão "Confirmar desvínculo" usa o candidato selecionado.

### 3. Atualizar o payload enviado

Enviar sempre os campos do **candidato escolhido** (não os filtros do topo):

```ts
{
  codigo_empresa: 1,
  numero_pedido: <do candidato>,
  item_pedido: <do candidato>,
  numero_op: contexto.numero_op,        // sempre quando houver
  numero_serie: <GS escolhido>,
  escopo: "item_pedido" | "vinculo_op", // novo
  limpar_e000cse: <true só p/ item_pedido>
}
```

### 4. Atualizar tipos

Adicionar ao `interface ContextoNumeroSerie`:
```ts
pedido_vinculado_op?: number;
item_vinculado_op?: number;
situacao_vinculo_op?: string;
```

### 5. Após sucesso

- Atualizar `contexto` com o retorno do backend.
- Limpar `selecionado` e `numero_serie_manual`.
- Recarregar `buscarProximos()`.

## Mudanças no contrato — `docs/backend-numero-serie-desvincular.md`

Adicionar campo opcional `escopo` no request:

```json
{
  "codigo_empresa": 1,
  "numero_pedido": 11510,
  "item_pedido": 1,
  "numero_op": 1111,
  "numero_serie": "GS-11705",
  "escopo": "vinculo_op",      // "item_pedido" (default) | "vinculo_op"
  "limpar_e000cse": false
}
```

Documentar comportamento por escopo:

- `escopo = "item_pedido"` (default, retrocompatível): libera registro em `USU_T075SEP` zerando `pedido_reservado` / `item_reservado`; se `limpar_e000cse=true`, limpa `E000CSE` do item.
- `escopo = "vinculo_op"`: libera registro em `USU_T075SEP` zerando `pedido_vinculado_op` / `item_vinculado_op` (e status volta para `LIVRE` se não houver outro vínculo); **não** mexe em `E000CSE` salvo se `limpar_e000cse=true` E o GS realmente estiver lá.

## Arquivos afetados

- `src/pages/NumeroSeriePage.tsx` — lista de candidatos, RadioGroup no diálogo, payload com `escopo`, tipos atualizados.
- `docs/backend-numero-serie-desvincular.md` — adicionar campo `escopo` e exemplos para os dois cenários.

## Fora de escopo

- Implementação da rota no backend FastAPI (você fará).
- Mudanças no Lovable Cloud (nenhuma).

## Problema

Hoje o sistema deixou vincular GS ao pedido **4891 (origem 230)** quando a OP **1111** é da origem **250 / pedido 11510**. Isso gerou o desencontro que estamos consertando agora. Precisamos **prevenir** vínculos cruzados entre OP e pedido de origens diferentes — não só permitir desvincular depois.

## Regra de negócio

Quando houver OP no contexto:

- A **origem da OP** (`origem_op`, ex.: 250) deve casar com a **origem do pedido** ao qual o GS será vinculado.
- Se origens divergirem, **bloquear a reserva/vínculo** com mensagem clara, oferecendo apenas a opção de "forçar" para um usuário com permissão (ou nunca, se preferir total bloqueio).

## Plano (frontend + contrato backend)

### 1. Frontend — `src/pages/NumeroSeriePage.tsx`

**Tipos**
- Adicionar em `ContextoNumeroSerie`: `origem_pedido?: string` (origem do pedido carregado, vinda do backend no `/contexto`).

**Validação local antes de enviar `/reservar`**
Em `reservar(forcarVinculo)`:
- Calcular `origemOp = contexto?.origem_op` e `origemPedido = contexto?.origem_pedido`.
- Se `numero_op > 0` e ambas existirem e forem diferentes:
  - Bloquear com toast vermelho:  
    *"OP {op} é da origem {origemOp} e não pode ser vinculada ao pedido {pedido} (origem {origemPedido}). Verifique o pedido correto da OP."*
  - **Não enviar** o request.
- Mesma checagem ao usar "Vincular GS Informado" (manual).

**Aviso visual no card de Contexto**
- Quando `origem_op` ≠ `origem_pedido`, mostrar `Alert` destrutivo no topo do card de Contexto:
  > "Divergência de origem: OP {op} = origem {X}; Pedido {Y} = origem {Z}. Reserva bloqueada."
- Desabilitar os botões "Reservar Selecionado" e "Vincular GS Informado" enquanto houver divergência.

**Filtro de origem (preventivo na busca)**
- O campo `origem_op` (hoje read-only, preenchido pelo backend) ganha um indicador visual (badge verde/vermelho) comparando com `origem_pedido` quando ambos estiverem carregados.

### 2. Contrato backend — atualizar `docs/backend-numero-serie-desvincular.md` e criar `docs/backend-numero-serie-validacao-origem.md`

Documentar que:

**`GET /api/numero-serie/contexto`** passa a retornar também:
```json
{
  "contexto": {
    "...": "...",
    "origem_op": "250",
    "origem_pedido": "230",        // novo
    "origens_conferem": false       // novo (conveniência)
  }
}
```

**`POST /api/numero-serie/reservar`** passa a validar:
- Se `numero_op` informado e `origem_op` ≠ `origem_pedido`, retornar `409 Conflict`:
  ```json
  {
    "detail": "OP 1111 (origem 250) não pode ser vinculada ao pedido 4891 (origem 230)."
  }
  ```
- A flag existente `forcar_vinculo` **não** deve burlar essa checagem (é uma proteção dura). Se quiser permitir override administrativo, criar um campo separado `forcar_origem_divergente: bool` que exige header de auditoria.

### 3. Atualizar `docs/backend-numero-serie-desvincular-fastapi.py` (esqueleto já planejado)

Adicionar no início do handler de `/reservar` (em arquivo separado de validação) um helper:
```python
def validar_origens(db, numero_op, numero_pedido, item_pedido):
    origem_op = buscar_origem_op(db, numero_op)
    origem_ped = buscar_origem_pedido(db, numero_pedido, item_pedido)
    if origem_op and origem_ped and origem_op != origem_ped:
        raise HTTPException(409, f"OP {numero_op} (origem {origem_op}) não pode ser vinculada ao pedido {numero_pedido} (origem {origem_ped}).")
```

## Arquivos afetados

- `src/pages/NumeroSeriePage.tsx` — tipo, validação local, alerta visual, desabilitar botões.
- `docs/backend-numero-serie-validacao-origem.md` — **novo**, contrato da validação.
- `docs/backend-numero-serie-desvincular.md` — nota cruzada apontando para o novo doc.

## Fora de escopo

- Implementação real no backend FastAPI (você fará, com o contrato novo).
- Mudanças em outras páginas que reservam GS.

## Pergunta antes de implementar

A divergência de origem deve ser **bloqueio duro** (nunca permite vincular) ou **bloqueio com override** (admin pode forçar com confirmação extra)?

## Problema

Quando você busca o contexto pelo **pedido 11510**, o sistema está retornando a **OP 1111**, mas essa OP está vinculada ao **pedido antigo 4891** (vínculo errado feito no passado). Você quer que o contexto mostre a **OP correta do pedido 11510** — não uma OP herdada de outro pedido.

Hoje o backend `/api/numero-serie/contexto` parece estar buscando "qualquer OP do produto" (ou usa `pedido_vinculado_op` antigo do `USU_T075SEP`), e por isso traz a OP do pedido errado.

## Como vamos resolver

A correção principal é no **backend** (vou documentar). No **frontend** vamos:

1. Tornar visível QUAL pedido a OP exibida está realmente atendendo (para você ver imediatamente o desencontro).
2. Adicionar regra: se a OP retornada está vinculada a um pedido diferente do que você digitou, exibir alerta amarelo "OP X está vinculada ao pedido Y, não ao pedido Z digitado" e **não** preencher o campo `OP` automaticamente.
3. Permitir que você digite manualmente a OP correta do pedido 11510 e re-buscar o contexto.

## Mudanças

### Frontend — `src/pages/NumeroSeriePage.tsx`

- Detectar mismatch usando os campos já existentes no `ContextoNumeroSerie`:
  - `numero_op` retornado vs `numero_pedido` digitado
  - `pedido_vinculado_op` / `item_vinculado_op` (já no tipo)
  - Se `pedido_vinculado_op` existe e é diferente do `numero_pedido` digitado/retornado, é o mesmo bug que estamos vendo.
- Novo `Alert` (warning amarelo) no card de Contexto:
  > "A OP {numero_op} está vinculada ao pedido **{pedido_vinculado_op}** (item {item_vinculado_op}), não ao pedido {numero_pedido} que você buscou. Confirme com a engenharia qual é a OP correta deste pedido ou desvincule a OP do pedido antigo antes de prosseguir."
- Não auto-preencher `filters.numero_op` quando esse mismatch existir (hoje é preenchido cego em `setFilters` após `buscarContexto`).
- Desabilitar **Reservar Selecionado** e **Vincular GS Informado** enquanto o mismatch persistir, com tooltip explicando.
- Manter o botão **Desvincular GS** habilitado (é justamente como você corrige).

### Backend — atualizar `docs/backend-numero-serie-desvincular.md` e criar `docs/backend-numero-serie-contexto-op-correta.md`

Documentar a regra para o time do backend FastAPI:

`GET /api/numero-serie/contexto` deve, quando recebe `numero_pedido` + `item_pedido`:

1. Buscar a OP **cujo pedido vinculado seja exatamente o pedido informado** — não a primeira OP que o produto tenha. Fontes possíveis (a confirmar com banco):
   - `USU_T075SEP` filtrando por `pedido_vinculado_op = :numero_pedido AND item_vinculado_op = :item_pedido`
   - Tabela de OPs (TPRIOP) cruzando com pedido
2. Se encontrar mais de uma OP candidata, retornar a mais recente e expor `ops_candidatas: [...]` para o frontend listar.
3. Se NÃO encontrar OP vinculada ao pedido, retornar `numero_op: 0` (não inventar com OP de outro pedido).
4. Ainda assim, se chamarem com `numero_op` explícito, retornar os campos `pedido_vinculado_op` / `item_vinculado_op` corretos para o front detectar mismatch.

## Arquivos afetados

- `src/pages/NumeroSeriePage.tsx` — alerta de mismatch pedido↔OP, não auto-preencher OP errada, desabilitar reserva.
- `docs/backend-numero-serie-contexto-op-correta.md` — **novo**, contrato.
- `docs/backend-numero-serie-desvincular.md` — nota cruzada.

## Fora de escopo

- Implementação no backend FastAPI (você faz com o contrato novo).
- Mexer em outras telas que mostram OP.

## Pergunta

A correção só com aviso visual + bloqueio é suficiente? Ou você quer que o frontend também ofereça um botão "Procurar OP correta deste pedido" que chame um endpoint novo `/api/numero-serie/ops-do-pedido?numero_pedido=11510` para listar candidatas?
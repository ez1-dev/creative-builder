## Objetivo
Permitir que o usuário **remova/desfaça o vínculo** de um Número de Série (GS) que foi reservado erroneamente em uma OP ou pedido, diretamente na página `Reserva Nº de Série`.

Hoje a página só permite **reservar** ou **vincular** — não há ação para desfazer um vínculo errado.

## Escopo

### 1. Backend FastAPI (externo via ngrok) — novo endpoint
Criar a rota:

```
POST /api/numero-serie/desvincular
```

**Request body:**
```json
{
  "codigo_empresa": 1,
  "numero_pedido": 123456,
  "item_pedido": 1,
  "numero_op": 100234,        // opcional, mas recomendado
  "numero_serie": "GS-11705", // GS atualmente vinculado
  "limpar_e000cse": true      // limpa o número de série gravado no item do pedido
}
```

**Comportamento esperado (a ser implementado no backend):**
1. Validar contexto (pedido/item/OP existem e o GS informado está realmente vinculado).
2. Liberar o registro em `USU_T075SEP` correspondente (status `RESERVADO` → `LIVRE`, zerar `pedido_reservado`/`item_reservado`).
3. Se `limpar_e000cse=true`, limpar o campo de número de série no item do pedido (`E000CSE` ou equivalente).
4. Retornar contexto atualizado igual à rota `/reservar`:
```json
{
  "mensagem": "Vínculo removido com sucesso.",
  "contexto": { ... ContextoNumeroSerie ... },
  "numero_serie_removido": "GS-11705"
}
```
5. Erros tratados: GS não pertence ao pedido/OP informado, GS já está LIVRE, pedido inexistente, etc. — retornar `400` com `detail` claro.

> Observação: como o backend FastAPI não está no repositório Lovable, esta etapa precisa ser implementada por você no projeto do backend. Posso gerar o snippet de doc em `docs/backend-numero-serie-desvincular.md` para servir de contrato/checklist.

### 2. Frontend — `src/pages/NumeroSeriePage.tsx`

**Novo botão de ação:**
- Adicionar botão `Desvincular GS` na barra de ações (ao lado de "Vincular GS Informado"), variante `destructive` ou `outline` com ícone `Unlink` (lucide).
- Habilitado quando: existir `contexto` carregado **E** (`contexto.numero_serie_atual` ou `contexto.numero_serie_vinculada_op` estiver preenchido) **OU** o usuário digitou um GS no campo `numero_serie_manual`.

**Fluxo:**
1. Ao clicar, abrir um `AlertDialog` (shadcn) de confirmação mostrando:
   - Pedido / Item / OP
   - Produto / Derivação
   - GS que será desvinculado (priorizar manual, senão `numero_serie_atual`)
2. Ao confirmar, chamar `api.post('/api/numero-serie/desvincular', body)`.
3. Em sucesso:
   - `toast.success(result.mensagem)`
   - Atualizar `contexto` com o retorno
   - Limpar `selecionado` e `filters.numero_serie_manual`
   - Recarregar lista via `buscarProximos()` para refletir o novo status `LIVRE`
4. Em erro: `toast.error(e.message)`.

**Nova função:**
```ts
const desvincular = async () => { ... }
const [loadingDesvincular, setLoadingDesvincular] = useState(false);
const [confirmOpen, setConfirmOpen] = useState(false);
```

**Ajuste visual:**
- No card de Contexto, quando `numero_serie_atual` estiver presente, mostrar um pequeno botão `Desvincular` ao lado do badge da série atual (atalho rápido).

### 3. Sem mudanças no Lovable Cloud
Não há alterações em tabelas, RLS, edge functions ou migrations — toda a lógica de desvínculo vive no backend FastAPI externo.

## Arquivos afetados
- `src/pages/NumeroSeriePage.tsx` (botão, dialog de confirmação, função `desvincular`)
- `docs/backend-numero-serie-desvincular.md` (novo — contrato do endpoint para o time de backend)

## Pergunta para o usuário antes de implementar
A rota `POST /api/numero-serie/desvincular` **já existe** no seu backend FastAPI, ou devo apenas:
- (a) implementar o frontend assumindo o contrato acima e você cria a rota no backend depois, **ou**
- (b) você já tem outro endpoint com nome/payload diferente e devo adaptar?

Me confirme isso (ou aprove como está) que sigo com a implementação.

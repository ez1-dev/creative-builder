## Diagnóstico

O Montador da DRE Gerencial (`src/pages/bi/contabilidade/DreMontadorPage.tsx` + `src/lib/bi/dreMontadorApi.ts`) já implementa a maior parte do fluxo pedido:
- Recebe `centros_custo[]` por conta no plano-contas e renderiza expandido com checkbox, código, descrição, valor, qtd de lançamentos.
- Marcar/desmarcar centros já implica marcar a conta; desmarcar todos os centros volta ao estado "Todos os centros".
- Tooltip da listagem mostra `Todos os centros` quando `cd_centro_custos` é nulo, ou o código quando específico.
- Payload já leva `centros_custo: [{ cd_centro_custos }]` quando marcado.

Faltam ajustes de contrato/UX descritos na especificação. Nenhum backend, migration, RPC ou regra contábil será tocado.

## Escopo (somente frontend)

Arquivos afetados:
- `src/lib/bi/dreMontadorApi.ts` — tipos, envio explícito de `centros_custo: []`.
- `src/pages/bi/contabilidade/DreMontadorPage.tsx` — labels, exclusividade explícita, mensagens de estado, toast com singular/plural, `centros_custo: []` no vínculo geral.

## Alterações

### 1. Tipos (`dreMontadorApi.ts`)
- Adicionar aliases exportados sem quebrar os existentes:
  ```ts
  export type CentroCustoConta = {
    cd_centro_custos: string;
    ds_centro_custos?: string | null;
    valor?: number | null;
    qtd_lancamentos?: number | null;
  };
  export type PlanoContaDre = {
    cd_conta_contabil: string;
    ds_conta_contabil?: string | null;
    qtd_centros?: number;
    centros_custo?: CentroCustoConta[];
  };
  export type ContaParaVinculo = {
    cd_conta_contabil: string;
    centros_custo: Array<{ cd_centro_custos: string }>;
  };
  ```
- Manter `PlanoContaCentroCusto` / `PlanoContaErp` / `VincularContasPayload*` como estão (compat interna).

### 2. Payload — `centros_custo: []` explícito
Em `DreMontadorPage.vincular`, hoje `base.centros_custo` só é setado quando há centros marcados. Alterar para **sempre** popular o campo:
```ts
const set = centrosSelecionados.get(contaKey(c));
base.centros_custo = set && set.size > 0
  ? Array.from(set).map((cd) => ({ cd_centro_custos: cd }))
  : [];
```
Isso atende a spec: "Nenhum centro marcado → `centros_custo: []`" (vínculo geral).

### 3. Exclusividade explícita
A lógica atual já é exclusiva por consequência (`n.delete(contaK)` quando `size===0`). Adicionar comentário curto e um teste-visual no rótulo:
- Quando nenhum centro está marcado para a conta: mostrar rótulo "Todos os centros" (não "Todos os centros desta conta").
- Quando há centros marcados: mostrar `N centro(s) específico(s)` e desabilitar visualmente o item "Todos os centros" (checkbox permanece — clicar volta ao geral, o que representa a operação "desmarcar todos").
- Ao clicar em "Todos os centros" com centros marcados → limpa a seleção (já implementado por `marcarTodosCentros`).

### 4. Mensagens de estado
- Conta sem centros no período (`ccs.length === 0`): substituir por "Esta conta não possui centros de custo no período selecionado. O vínculo valerá para todos os centros." e manter a marcação implícita "Todos os centros".
- Erro de plano-contas (já existente via `toast.error`): manter, sem duplicar.
- Estado "Carregando centros de custo…" só é aplicável se um dia forem buscados de forma lazy. Como o backend devolve tudo no plano-contas, não adicionar spinner por conta — o loader global (`loadingContas`) já cobre.

### 5. Toast criados/ignorados com singular/plural
Substituir a linha atual por:
```ts
const c = r.criados ?? 0;
const i = r.ignorados_por_duplicidade ?? 0;
const parts: string[] = [];
if (c > 0) parts.push(`${c} vínculo${c === 1 ? '' : 's'} criado${c === 1 ? '' : 's'}.`);
if (i > 0) parts.push(`${i} vínculo${i === 1 ? '' : 's'} já existia${i === 1 ? '' : 'm'} e foi${i === 1 ? '' : 'ram'} ignorado${i === 1 ? '' : 's'}.`);
if (parts.length === 0) parts.push('Nenhum vínculo criado.');
toast.success(parts.join(' '));
```

### 6. Estabilidade da seleção durante busca/paginação
Já funciona porque `contasSelecionadas` e `centrosSelecionados` são chaveados por `contaKey(c) = cd_mascara||cd_conta_contabil`. Confirmar por leitura que `busca` só chama `carregarContas()` e não limpa esses states. Ajuste: quando `contas` muda, **não** limpar seleção. Manter.

### 7. Listagem de vínculos existentes
Tooltip atual já mostra `codigo_linha — cd_centro_custos ?? 'Todos os centros'`. Manter. Sem grid separada — a listagem detalhada de vínculos é atribuição do painel de "Modelo/Linhas", que não faz parte desta tarefa.

### 8. Exclusão de vínculos
Fora do escopo do Montador (a exclusão hoje é feita em outra tela / no backend). Não alterar.

## Não alterar
Backend, migrations, RPC, endpoints, autenticação, modelos/linhas da DRE, cálculo, distribuição de valores por centro.

**Nota sobre endpoint plano-contas**: hoje o Montador usa `GET /api/bi/contabilidade/plano-contas-disponivel`, que já retorna `centros_custo[]`. A spec cita `GET /api/bi/contabilidade/dre-dinamica/plano-contas`. Como o próprio comentário do código declara essa rota como fonte, e a instrução é "não alterar backend", vou manter a URL atual. Se o backend passar a expor a rota canônica, é trocar apenas a constante em `fetchPlanoContasDinamica`.

## Validação
1. Abrir Montador, escolher modelo e linha.
2. Expandir uma conta com múltiplos centros; marcar 2 → rótulo passa a "2 centros específicos".
3. Desmarcar tudo → volta a "Todos os centros".
4. Enviar vínculo geral e capturar payload no console: `centros_custo: []`.
5. Enviar vínculo específico: `centros_custo: [{ cd_centro_custos: "10780" }, ...]`.
6. Conferir toast: "N vínculo(s) criado(s). M vínculo(s) já existia(m) e foi(ram) ignorado(s)."
7. Buscar/filtrar a lista e confirmar que as marcações prévias continuam vivas para as contas que reaparecem.

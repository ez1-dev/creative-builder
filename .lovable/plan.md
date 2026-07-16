## Escopo

Duas mudanças no BI de Contabilidade, tudo no frontend:

1. Drill de Lançamentos (`DreDrillDrawer`) — exibir centro de custos.
2. Montador da DRE Dinâmica — permitir vincular contas restringindo a centros de custo específicos.

## 1) Drill de Lançamentos — Centro de Custos

Arquivos:
- `src/components/bi/contabilidade/DreDrillDrawer.tsx`
- `src/lib/bi/dreDrillApi.ts`

Mudanças:

- Em `DreDrillRow` adicionar campos opcionais `cd_centro_custos`, `ds_centro_custos`, `cd_centro_custos_3`.
- No `DreDrillDrawer`, quando `current.tipo_drill === 'LANCAMENTO'`:
  - Garantir colunas Centro de Custos (`cd_centro_custos`) e CC Grupo (`cd_centro_custos_3`) na tabela: se o backend já mandar em `data.columns`, respeitar; se não vier, injetar como colunas extras antes da coluna de valor.
  - Renderizar as linhas exatamente como vêm em `data.rows` (sem `groupBy`/dedupe por `cd_lancamento` ou `nr_lancamento`). O código atual já faz isso — apenas documentar via comentário para evitar regressão.
  - Se `cd_centro_custos` (ou `cd_cencus`) vier `null`/`""`, exibir `SEM CENTRO` (label em `text-muted-foreground italic`).
- Chaves compatíveis: tratar tanto `cd_centro_custos` quanto o legado `cd_cencus` na leitura da célula.
- Total do rodapé continua somando `vl_realizado` de todas as linhas retornadas (é o valor rateado).

## 2) Montador da DRE Dinâmica — seleção de centros por conta

Arquivos:
- `src/lib/bi/dreMontadorApi.ts`
- `src/pages/bi/contabilidade/DreMontadorPage.tsx`

API (`dreMontadorApi.ts`):
- Estender `VincularContasPayload.contas[]` para aceitar
  `centros_custo?: { cd_centro_custos: string }[]`.
- Ajustar retorno de `vincularContasDinamica` para
  `{ criados: number; ignorados_por_duplicidade: number; vinculadas?: number }`
  lendo `data.criados`, `data.ignorados_por_duplicidade` (fallback nos campos antigos).
- Em `PlanoContaErp` expor também `linhas_vinculadas` como objetos
  `{ codigo_linha: string; cd_centro_custos: string | null }[]` quando o backend fornecer, mantendo compatibilidade com o formato atual de `string[]`.

UI (`DreMontadorPage.tsx`):
- Estado novo: `centrosSelecionados: Map<contaKey, Set<cd_centro_custos>>`.
- Na linha expandida (`FragmentRow`) que já lista `centros_custo`:
  - Adicionar coluna de checkbox por centro.
  - Cabeçalho com checkbox "todos os centros desta conta" (marca/limpa o Set).
  - Se a conta está selecionada mas nenhum centro marcado → texto "Vale para todos os centros da conta".
- Regra de UX: se o usuário marcar centros específicos, considerar automaticamente a conta como selecionada; se desmarcar a conta, limpar o Set daquele contaKey. Não é permitido marcar centros de uma conta sem marcá-la — a UI ignora e força a seleção da conta.
- Montagem do payload em `vincular()`:
  - Para cada conta selecionada, incluir `centros_custo` apenas se o Set não estiver vazio; senão omitir/enviar `[]` (backend interpreta como "todos").
- Toast de sucesso passa a mostrar:
  `Vinculadas: {criados} · Ignoradas (duplicadas): {ignorados_por_duplicidade}`.
- Tooltip de "Vinculada" na coluna Status:
  - Se `linhas_vinculadas` vier em formato objeto, exibir uma linha por vínculo no padrão
    `codigo_linha — cd_centro_custos || "Todos os centros"`.
  - Formato legado (string) continua funcionando.

## Não faremos agora

- Não mexer no `PlanoContasPanel` do DRE Studio clássico nem no `DrillDrawer` do DRE Studio (usam outra API `/api/contabil/...`).
- Não alterar backend, edge functions ou migrations.

## Validação

- Abrir o drill de LANCAMENTO em uma linha com rateio: conferir que aparecem múltiplas linhas para o mesmo lançamento, cada uma com seu `cd_centro_custos`, e que a soma bate com o valor da linha na DRE.
- No Montador: expandir uma conta com centros, marcar 2 de 5 centros e vincular; conferir no toast os contadores e recarregar contas para ver o vínculo específico refletido na coluna Vinculada.

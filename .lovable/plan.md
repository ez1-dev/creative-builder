
# Plano — ATU_CONTABILIDADE na Central de Integrações / ETL

Adicionar painel administrativo "BI - Contabilidade / ATU_CONTABILIDADE" na tela `/etl`, no mesmo padrão visual do `TauxPanel` existente (já consumido por `EtlAdminPage`). Sem alterar dashboards comerciais nem o backend.

## Arquivos novos

### 1. `src/lib/bi/contabilidadeApi.ts`
Cliente tipado dos 4 endpoints. Usa o `api` de `@/lib/api` (já anexa `Authorization: Bearer <token>` e trata 401 como logout/redirect — mesmo helper usado por `tauxApi.ts`).

```ts
export const ATU_CONTABILIDADE_ACOES = [
  { ordem: 1,  nome: 'VM_ORC_DRE',                tabela: 'bi_vm_orc_dre' },
  { ordem: 2,  nome: 'VM_LANC_CONTABIL',          tabela: 'bi_vm_lanc_contabil' },
  { ordem: 3,  nome: 'ETL_V_BALANCO_PATRIMONIAL', tabela: 'bi_balanco_patrimonial' },
  { ordem: 99, nome: 'ATU_CONTABILIDADE',         tabela: '—' },
] as const;

export interface ContabStatusItem {
  ordem: number;
  nome_acao: string;
  tabela_supabase: string | null;
  total_registros: number | null;
  status: string;
  ultima_execucao: string | null;
  erro?: string | null;
}
export interface ContabLogItem { ordem; nome_acao; tabela_supabase; anomes_ini; anomes_fim; status; qtd_linhas; erro; acionado_por; iniciado_em; finalizado_em; }

getContabilidadeStatus(anomes_ini, anomes_fim)        // GET /api/bi/contabilidade/status
syncContabilidade(anomes_ini, anomes_fim, acoes?)     // POST /api/bi/contabilidade/sync
getContabilidadeLog(limit=100)                        // GET /api/bi/contabilidade/log
getContabilidadeData(nomeBase, anomes_ini, anomes_fim, limit, offset) // GET /api/bi/contabilidade/{base}
```

Os nomes de tabela exibidos são apenas rótulos visuais — não usamos a tabela do Cloud diretamente.

### 2. `src/components/etl/contabilidade/AtuContabilidadePanel.tsx`
Painel principal (Card) com:
- **Filtros no topo**: dois `Input` para `ANOMES_INI` / `ANOMES_FIM` (placeholder `202606`, validação `^\d{6}$`), botão "Atualizar status" e botão "Executar rotina completa".
- Valor inicial: mês atual em `YYYYMM`.
- **4 KPI cards** (mesmo padrão `KpiCard` do `EtlAdminPage`):
  - Total VM_ORC_DRE
  - Total VM_LANC_CONTABIL
  - Total ETL_V_BALANCO_PATRIMONIAL
  - Status geral (derivado: ERRO se algum status=ERRO; EXECUTANDO se algum INICIADO/EXECUTANDO; CONCLUIDO se todos OK; senão —)
  - Quinto card pequeno: Última execução (max `ultima_execucao`).
- **Tabela de ações** (`DataTable`) ordenada por `ordem` com colunas: Ordem · Ação · Tabela Supabase · Total · Status (badge colorido) · Ações.
  - "Executar esta ação" (Play) → `syncContabilidade(ini, fim, [nome])`. Para a linha 99 (`ATU_CONTABILIDADE`) o botão chama `sync` sem `acoes`.
  - "Visualizar dados" (Eye): só ativo para linhas 1/2/3, abre `ContabilidadeViewerDialog`.
- **Botão "Ver log"** abre `ContabilidadeLogDialog`.

Comportamento:
- `useQuery(['contab-status', ini, fim], …)` com `refetchInterval` ativo (5s) enquanto houver `INICIADO/EXECUTANDO`, igual ao `TauxPanel`.
- Mutations exibem `toast` de sucesso/erro e invalidam a query de status.
- Botões executando mostram `Loader2` spinning + ficam desabilitados (`syncingSet`).

### 3. `src/components/etl/contabilidade/ContabilidadeViewerDialog.tsx`
Drawer/Dialog amplo com tabela dinâmica:
- Aceita `nomeBase`, `anomesIni`, `anomesFim`.
- Carrega `getContabilidadeData` com paginação simples (limit 100, botões Anterior/Próximo offset).
- Renderiza colunas dinamicamente a partir das chaves do primeiro registro (ou `columns` do response, se vier).
- Loading skeleton + estado vazio.

### 4. `src/components/etl/contabilidade/ContabilidadeLogDialog.tsx`
Dialog com `DataTable` consumindo `getContabilidadeLog(100)`. Colunas: ordem, nome_acao, tabela_supabase, anomes_ini, anomes_fim, status (badge), qtd_linhas, erro (truncado + tooltip), acionado_por, iniciado_em, finalizado_em. Botão "Atualizar".

## Arquivo alterado

### `src/pages/EtlAdminPage.tsx`
Inserir `<AtuContabilidadePanel />` logo abaixo de `<TauxPanel />`. Nenhuma outra mudança.

## Estados visuais (mapeamento de cores)

Reaproveitar exatamente o `STATUS_COLOR` já usado em `TauxPanel`:
- `CONCLUIDO`/`OK` → verde
- `INICIADO`/`EXECUTANDO`/`EM_EXECUCAO` → azul/amarelo
- `ERRO` → vermelho
- `SEM_DADOS`/vazio → cinza (`bg-muted text-muted-foreground`)

Adicionar `SEM_DADOS` no mapeamento local com tom cinza.

## Segurança / Auth

`@/lib/api` já injeta `Authorization: Bearer <token>` e, em 401, dispara `logout()` + redirect para `/login` via interceptor existente. Não precisa código extra.

## Fora do escopo

- Backend (`/api/bi/contabilidade/*` já existe — só consumimos).
- Tabelas Cloud (`bi_*` contábeis): nomes aparecem só como texto.
- Dashboards comerciais permanecem intactos.
- Nenhuma alteração em `TauxPanel`, `tauxApi`, rotas ou sidebar (a tela `/etl` já está montada).

## Verificação

1. Acessar `/etl`, ver painel "BI - Contabilidade" abaixo do TAUX.
2. Preencher 202606/202606 → "Atualizar status" popula KPIs e tabela.
3. "Executar esta ação" em `VM_ORC_DRE` → status muda para EXECUTANDO, refetch automático, finaliza CONCLUIDO.
4. "Visualizar dados" abre dialog com linhas paginadas.
5. "Ver log" abre dialog com últimas 100 execuções.
6. Tirar o token (deslogar em outra aba) e tentar executar → API responde 401 → redirect para `/login`.

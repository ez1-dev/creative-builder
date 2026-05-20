# Segunda Onda — Desenvolvimento de Relatórios

Refinar o módulo já criado (`/relatorios/desenvolvimento`) para entregar configuração avançada de colunas, exportações com download automático, histórico embutido no editor, duplicação e preview com totalizadores, cabeçalho fixo e avisos.

## Escopo

### 1. Banco — Lovable Cloud (1 migration)

Apenas um pequeno ajuste em `relatorio_colunas`:

- Adicionar coluna `largura integer NULL` (largura em px ou %, opcional).

Demais campos (`campo`, `titulo`, `visivel`, `ordem`, `tipo`, `formato`, `alinhamento`, `totalizar`, `agrupar`) já existem. Nenhuma RLS nova é necessária — políticas atuais (admin gerencia, usuários leem se relatório está publicado) seguem valendo.

### 2. Tipos e API (`src/lib/relatorios/`)

`types.ts`
- Estreitar `RelatorioColuna.tipo` para `'texto' | 'numero' | 'moeda' | 'data' | 'data_hora' | 'percentual'` (com fallback string para compatibilidade).
- Adicionar `largura: number | null`.
- Adicionar tipo `RelatorioExecucaoEnriquecida` que junta `executado_por_nome` (resolvido via `profiles`).

`api.ts`
- Manter `saveColunas` no Cloud (CRUD de metadata fica em Cloud por arquitetura). Adicionar wrapper opcional `salvarConfigColunas(id, colunas_config)` que equivale conceitualmente ao `PUT /api/relatorios/{id}/colunas` documentado.
- Manter `duplicarRelatorio` em Cloud (já existe).
- Ajustar `exportarRelatorio` para também ler `Content-Disposition` e devolver `{ blob, filename }` e gravar execução com `formato` e `tempo_ms` no Cloud.
- Adicionar `listExecucoesPorRelatorio(id)` que faz join com `profiles` para resolver nome do usuário e ordena DESC.
- `gravarExecucao` ganha campo opcional `arquivo` (string nullable) — armazenado em `parametros.arquivo` (sem migrar schema para não inflar tabela).

### 3. Editor de Colunas (`ColumnsEditor.tsx`)

Reescrever a aba "Colunas":
- Listar todas as colunas vindas do preview (`onColumnsDetected` já alimenta o estado).
- Para cada linha: Campo (read-only), Título (input), Visível (switch), Ordem (setas + drag handle), Tipo (select com 6 valores acima), Formato (input livre — ex.: `dd/MM/yyyy`, `#,##0.00`), Alinhamento (select), Largura (input numérico, opcional), Totalizar (switch), Agrupar (switch).
- Botões no topo: **Salvar configuração de colunas** (grava só colunas via `saveColunas`) e **Restaurar padrão** (re-executa preview e regenera colunas com defaults sensatos por tipo inferido).
- Visual: tabela com sticky header dentro de container scrollável.

### 4. Preview avançado (`ReportPreview.tsx`)

- Receber `colunasConfig: ColDraft[]` do editor e aplicar:
  - Filtrar/ordenar pelas configs (somente `visivel`, na ordem definida).
  - Usar `titulo` como header; aplicar `alinhamento` (`text-left|center|right`) no `<TableHead>` e `<TableCell>`.
  - Aplicar `largura` via `style={{ width }}` no `<th>`.
  - Formatação básica por `tipo`:
    - `numero` → `Intl.NumberFormat('pt-BR')`
    - `moeda` → `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`
    - `percentual` → `value*100` com `%`
    - `data` → `format(d, 'dd/MM/yyyy')`
    - `data_hora` → `format(d, 'dd/MM/yyyy HH:mm')`
    - `texto` → toString
  - Linha de **totalizadores no rodapé** (`<TableFooter>`): soma das colunas com `totalizar=true` e tipos numéricos/moeda/percentual; coluna sem totalizar mostra string vazia, primeira mostra "TOTAL".
- Rolagem horizontal: wrapper `overflow-x-auto` (não cortar conteúdo). Cabeçalho congelado via `sticky top-0` no `<TableHeader>` e `bg-card` para não vazar.
- Stats no topo da grid: `X linha(s) • Yms` + aviso amber quando `linhas.length === 100`: "Preview limitado a 100 linhas".
- Botões **Exportar Excel** e **Exportar CSV** (PDF mantido desabilitado — fica para 3ª onda). Após download, gravar execução no Cloud e disparar `onExecucaoGravada()` callback para o histórico recarregar.
- Download automático: criar `<a download>` + `URL.createObjectURL(blob)` (já implementado, melhorar com filename do `Content-Disposition`).

### 5. Aba "Histórico" dentro do editor (`ReportEditor.tsx`)

Adicionar 7ª aba `Histórico` visível somente quando `relatorio.id` existe.

Novo componente `ReportExecutionHistory` com colunas:
| Data/Hora | Usuário | Tipo execução | Formato | Linhas | Tempo | Status | Arquivo | Erro |

Regras:
- Tipo execução: `formato === 'grid' ? 'Preview' : 'Exportação'`.
- Formato: badge minúsculo (`grid`, `excel`, `csv`, `pdf`).
- Status: `ok` → badge verde, `erro` → badge vermelho (linha inteira com tinta `text-destructive`).
- Tempo: `<1000ms` mostra `Xms`; `≥1000ms` mostra `(X/1000).toFixed(2) s`.
- Arquivo: link "Baixar novamente" se `parametros.arquivo` presente (apenas exibe nome).
- Erro: tooltip se truncar.
- Botão de refresh + auto-reload após `onExecucaoGravada` do preview.

### 6. Lista de Relatórios (`ReportList.tsx`)

Já tem ação "Duplicar" no `DropdownMenu`. Confirmar:
- Após duplicar, abrir relatório novo no editor (já implementado em `DesenvolvimentoRelatoriosPage`).
- Toast "Relatório duplicado em RASCUNHO".

### 7. Página principal (`DesenvolvimentoRelatoriosPage.tsx`)

Sem mudanças estruturais. Apenas garantir que `reload()` é disparado após duplicação/publicação/inativação (já está).

### 8. Histórico Global (`HistoricoExecucoesPage.tsx`)

- Aproveitar as melhorias visuais (cor por status, tempo em segundos, badge formato, tipo execução derivada).
- Adicionar filtro simples: `Select` por status (todos/ok/erro) e `Input` por código/nome de relatório.

### 9. Backend FastAPI — atualizar `docs/backend-relatorios.md`

Adicionar seções:
- `PUT /api/relatorios/{id}/colunas` — contrato conceitual (no frontend é Cloud direto; documentar para futura migração).
- `GET /api/relatorios/{id}/execucoes` — idem (Cloud por enquanto).
- Confirmar contrato dos endpoints de exportação: response com `Content-Disposition: attachment; filename="..."` para que o frontend extraia o nome.

## Fora de escopo (3ª onda)

PDF avançado, gráficos, drill-down, permissões por usuário/perfil, agendamento, versionamento de SQL.

## Ordem de implementação

1. Migration: `relatorio_colunas.largura`.
2. Tipos + ajustes em `api.ts` (filename de download, novo helper de histórico por relatório).
3. `ColumnsEditor.tsx` reescrito com todos os campos, botões Salvar/Restaurar padrão.
4. `ReportPreview.tsx`: aplicar config, formatação, totalizadores, sticky header, aviso 100 linhas, callback de execução gravada.
5. Novo `ReportExecutionHistory.tsx` + aba "Histórico" no `ReportEditor`.
6. Ajustes visuais no `HistoricoExecucoesPage.tsx` (cor, tempo, filtros).
7. Atualizar `docs/backend-relatorios.md`.

## Riscos

- Backend FastAPI ainda não implementa `/preview` nem `/exportar/*` — UI fica funcional mas chamadas mostram erro até o backend chegar. Documentado no `.md`.
- Formatação por tipo é heurística: campos numéricos vindos como string do ERP precisam de coerção tolerante (`Number(v)` com fallback).

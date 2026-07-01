## Ajustes na tela RH — 01 Resumo Folha (fonte oficial VM_FOLHA)

### 1. Novo endpoint de sincronização VM_FOLHA
Em `src/lib/rh/api.ts`:
- Adicionar `sincronizarVmFolha({ codemp, anomes_ini, anomes_fim })` chamando `POST /api/rh/vm-folha/sincronizar?codemp=...&anomes_ini=...&anomes_fim=...` via `api.post` (mesmo cliente autenticado usado hoje).
- Manter `sincronizarRh` existente (usado em outras telas do módulo RH).
- Estender tipo `ResumoFolhaDashboard["diagnostico"]` (ou manter `any`) documentando os campos novos: `vm_folha_status`, `vm_folha_componentes`, `qtd_linhas_vm_folha`, `menor_anomes_vm_folha`, `maior_anomes_vm_folha`.

### 2. Botão "Sincronizar RH" da tela Resumo Folha
Trocar o `SincronizarRhDialog` genérico do `RhPageHeader` **apenas nesta tela** por um botão dedicado "Sincronizar RH" que:
- Usa o período já selecionado nos filtros da tela (`anomes_ini`, `anomes_fim`, `codemp`).
- Chama `sincronizarVmFolha(...)`.
- Toast de loading → sucesso: `"Sincronização da VM_FOLHA concluída."` → invalida `queryKey ["rh","resumoFolhaDashboard", ...]` para recarregar o dashboard automaticamente.
- Erro: toast `"Não foi possível sincronizar a VM_FOLHA. Verifique a API/ETL."` (com detalhe técnico do erro no `description`).
- Estado `loading` desabilita o botão e mostra spinner.
- Adicionado como `actions` do `RhPageHeader` (o botão genérico "Sincronizar RH" do header pode ser mantido escondido nesta tela passando um flag opcional `hideSync` — ajuste pequeno em `RhPageHeader`).

### 3. Estado "sem dados sincronizados"
No `ResumoFolhaPage.tsx`, detectar quando o dashboard voltar sem valores úteis:
- Condição: todos os KPIs de `data.kpis` são `0`/ausentes **e** `data.filiais.length === 0` **e** `data.mensal.length === 0` (ou `data.diagnostico?.qtd_linhas_vm_folha === 0`).
- Nesse caso, **não renderizar** os cards com `R$ 0,00`. Renderizar um bloco de aviso destacado:
  - Texto: `"Base oficial VM_FOLHA ainda não sincronizada para o período selecionado."`
  - Botão `"Sincronizar agora"` que dispara a mesma ação do botão do header.
- Se houver ao menos um KPI populado, manter o comportamento atual (cards + `ValueOrMissing` para campos ausentes).

### 4. Diagnóstico Técnico (admin) — novos campos
No bloco `Collapsible` existente "Diagnóstico Técnico" (visível só para `isAdmin`):
- Adicionar linhas para `vm_folha_status`, `qtd_linhas_vm_folha`, `menor_anomes_vm_folha`, `maior_anomes_vm_folha`.
- Renderizar `vm_folha_componentes` como lista (mesmo padrão do atual `custo_total_componentes`).
- Se `qtd_linhas_vm_folha === 0`, mostrar destaque amber: `"VM_FOLHA sem carga para o período selecionado."`

### 5. Regras mantidas (nada muda)
- Nenhum cálculo de KPI no front.
- Sem soma de eventos, `custo_total`, etc.
- Sem consulta direta ao Supabase (`public.rh_vm_folha`) do front.
- Cards e tabelas continuam lendo `response.kpis` e `response.filiais` como já fazem.
- Drills de Proventos/Descontos permanecem analíticos.

### Arquivos afetados
- `src/lib/rh/api.ts` — novo `sincronizarVmFolha` + tipagem opcional do diagnóstico.
- `src/components/rh/RhPageHeader.tsx` — prop opcional `hideSync?: boolean`.
- `src/pages/rh/ResumoFolhaPage.tsx` — botão dedicado, estado vazio com CTA, novos campos no Diagnóstico Técnico.
- (Sem migrations, sem edge functions, sem alterações em outras telas do módulo RH.)

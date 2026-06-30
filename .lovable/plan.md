
# Melhorias no Módulo RH

O módulo RH já está implementado (menu, 5 telas, sync, formulários). Este plano corrige inconsistências com o spec e adiciona refinamentos.

## 1. Resumo Folha — enviar filtros à API
Hoje `ResumoFolhaPage` só envia `anomes_ini/fim`. Spec lista Filial e Matrícula como filtros.
- Passar `filial` e `matricula` em `fetchResumoFolha` (quando preenchidos) e incluir no `queryKey`.
- Corrigir KPI **Líquido**: hoje soma `liquido_calculado` linha-a-linha (eventos), o que multiplica o valor. Calcular como `proventos - descontos`.

## 2. Filtros server-side nas demais telas
`QuadroColaboradoresPage`, `ContratoExperienciaPage`, `ProgramacaoFeriasPage` enviam params vazios e filtram tudo no cliente.
- Manter filtragem local (rápida), mas também propagar `filial`, `status`, `centro_custo`, `cargo`, `colaborador` ao endpoint quando definidos, incluindo no `queryKey` — assim grandes bases não estouram memória.

## 3. SincronizarRhDialog — feedback em duas etapas
Hoje só mostra toast no fim. Spec exige três mensagens.
- Mostrar toast "Sincronizando RH..." ao iniciar (id persistente).
- Substituir por "RH sincronizado com sucesso" no `onSuccess` ou "Falha na sincronização: <detalhe>" no `onError`, extraindo `error.response?.data?.detail` quando houver.
- Após sucesso, além de `invalidateQueries(["rh"])`, manter dialog fechado.

## 4. Formulários — filtros + edição de status
Spec: "Edição visual simples por status" e listagem com filtros.
- Adicionar filtros (Tipo, Status, busca por matrícula/colaborador).
- Badge de status colorido (ABERTO/EM_ANALISE/CONCLUIDO/CANCELADO).
- Coluna "Ações" com `<Select>` inline para alterar status: chama `PATCH /api/rh/formularios/{id}` (novo método `atualizarStatusFormulario` em `lib/rh/api.ts`). Se backend não suportar PATCH, fallback para POST no mesmo recurso com `id`.
- Toast de sucesso/erro e invalidate da query.

## 5. Pequenos ajustes
- `RhIndexPage`: mostrar contagem retornada pelo backend (se vier no menu) ou ignorar; remover ícone `FileCheck` não usado.
- `SincronizarRhDialog`: validar que `fim >= ini` antes de submeter.

## Arquivos afetados
- `src/lib/rh/api.ts` — novos params e `atualizarStatusFormulario`.
- `src/components/rh/SincronizarRhDialog.tsx` — toasts em etapas + validação.
- `src/components/rh/FormularioDialog.tsx` — sem mudança estrutural.
- `src/pages/rh/ResumoFolhaPage.tsx` — filtros server-side + KPI líquido.
- `src/pages/rh/QuadroColaboradoresPage.tsx`
- `src/pages/rh/ContratoExperienciaPage.tsx`
- `src/pages/rh/ProgramacaoFeriasPage.tsx`
- `src/pages/rh/FormulariosPage.tsx` — filtros + edição de status.

## Fora de escopo
- Não alterar autenticação (já usa Bearer via `api`).
- Não criar tabelas no Cloud — tudo via FastAPI.
- Não mexer em `AppSidebar` (rotas já registradas).

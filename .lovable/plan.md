# Mover TAUX / Dimensões para dentro da Central de Integrações (/etl)

Acoplar o painel TAUX como um card extra dentro da página `/etl` (Central de Integrações), no mesmo padrão visual das outras seções, e remover a rota standalone `/bi/taux` (junto com o item de menu) — mantendo apenas a tela ETL como ponto de entrada, igual ao gancho do ATU_COMERCIAL.

## Mudanças

1. **Novo componente** `src/components/etl/TauxPanel.tsx`
   - Card com `CardHeader` ("TAUX / Dimensões") e ação **Sincronizar todas as TAUX** no canto.
   - Mini-KPIs em linha (4 contadores compactos): Total de TAUX, Concluídas, Com erro, Última sincronização — usando o mesmo visual dos KPIs já presentes na `EtlAdminPage`.
   - `DataTable` (mesmo componente já usado nessa página) com colunas: TAUX, Tabela Cloud, Registros, Última sincronização, Status (badge + spinner enquanto INICIADO/EXECUTANDO + tooltip com `erro` quando ERRO), Ações (Visualizar / Sincronizar esta TAUX).
   - Polling automático a cada 5 s enquanto alguma TAUX estiver em execução; refetch após cada sync; toasts de sucesso/erro.
   - Reaproveita `src/lib/bi/tauxApi.ts` (`getTauxStatus`, `syncTaux`, `TAUX_LIST`) e `src/components/bi/taux/TauxViewerDialog.tsx` já criados (sem mexer neles).

2. **`src/pages/EtlAdminPage.tsx`**
   - Importar e renderizar `<TauxPanel />` logo abaixo do card "Tarefas" existente (ordem: KPIs → Tarefas → TAUX / Dimensões).
   - Nenhuma outra alteração nas tarefas atuais.

3. **Remover a tela standalone**
   - `src/App.tsx`: remover o import `TauxAdminPage` e a `<Route path="/bi/taux">`.
   - `src/components/AppSidebar.tsx`: remover o item `TAUX / Dimensões` adicionado em `biSubItems`.
   - `src/lib/screenCatalog.ts`: remover a entrada `/bi/taux`.
   - `src/pages/bi/TauxAdminPage.tsx`: excluir o arquivo (não terá mais uso).

4. **Permissão**
   - Não é necessária nova permissão — quem já tem acesso a `/etl` vê o painel automaticamente, exatamente como o gancho de metas do ATU_COMERCIAL.

## Fora de escopo
- Não alterar `tauxApi.ts` nem o `TauxViewerDialog`.
- Não alterar nada nos módulos comerciais nem nas tarefas ETL existentes.

# Mover ATU_CONTABILIDADE para a Central de Integrações / ETL

A tarefa `ATU_CONTABILIDADE` já está cadastrada em `etl_tarefas` (grupo `CONTABILIDADE`), portanto ela já aparece automaticamente na lista da página `/etl` (Central de Integrações / ETL), junto com `ATU_COMERCIAL` etc. O detalhe abre em `/etl/tarefas/ATU_CONTABILIDADE` via `EtlTarefaDetalhePage`.

O que precisa ser removido é o atalho duplicado criado na sidebar e no catálogo de telas.

## Mudanças

1. **`src/components/AppSidebar.tsx`**
   - Remover o item "Contabilidade — Atualização" (ícone `Database`, rota `/etl/tarefas/ATU_CONTABILIDADE`) que foi adicionado no grupo BI/Contabilidade.
   - O acesso passa a ser exclusivamente pela Central ETL (`/etl` → clicar na linha `ATU_CONTABILIDADE`).

2. **`src/lib/screenCatalog.ts`**
   - Remover a entrada `/etl/tarefas/ATU_CONTABILIDADE` (código `CONT_ATU`). A rota continua existindo (registrada como `/etl/tarefas/:nome`), e a permissão é controlada pela tela genérica `/etl`.

3. **`src/pages/ConfiguracoesPage.tsx`**
   - Remover a entrada `/etl/tarefas/ATU_CONTABILIDADE` da lista de telas configuráveis (mesmo motivo do item 2).

4. **Sidebar — grupo BI > Contabilidade**
   - Mantém apenas "DRE" (`/bi/contabilidade/dre`). Sem atalho de atualização ali.

## Não muda

- A migration (`ATU_CONTABILIDADE` + 4 ações em `etl_acoes`) permanece intacta.
- `EtlTarefaDetalhePage` continua servindo a tarefa (editar SQL, executar, ver logs, testar SQL).
- Doc `docs/backend-etl-contabilidade.md` permanece (contrato dos endpoints).
- Página DRE (`/bi/contabilidade/dre`) continua consumindo `GET /api/bi/contabilidade/dre`.

## Resultado

- Usuário acessa **Central de Integrações / ETL** → vê `ATU_CONTABILIDADE` no grupo `CONTABILIDADE` → clica para abrir o detalhe com as 4 ações (`VM_ORC_DRE`, `VM_LANC_CONTABIL`, `ETL_V_BALANCO_PATRIMONIAL`, `ATU_CONTABILIDADE`).
- Mesmo fluxo de `ATU_COMERCIAL`.

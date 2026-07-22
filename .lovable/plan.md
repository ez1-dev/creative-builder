## Contexto

Confirmei que `/contabilidade/dre-padrao` já está cadastrada em `ALL_SCREENS` (linha 58 de `src/pages/ConfiguracoesPage.tsx`) e que a aba antiga **Permissões por Tela** renderiza o mesmo `PermissoesPorTelaPanel` com essa mesma lista. Então, na teoria, ela deveria aparecer no grupo **Financeiro / Contábil**.

Como você diz que não aparece, o problema é um destes três (a investigação vai confirmar qual):

1. Bundle antigo em cache no navegador (a linha foi adicionada mas o build servido ainda não reflete).
2. O grupo **Financeiro / Contábil** está recolhido e a tela some visualmente entre as outras (`DRE Studio`, `Balanço`, etc.).
3. Regressão no agrupamento/filtragem do `PermissoesPorTelaPanel` (ex.: `getModule` retornando categoria inesperada, ou a busca não limpa afetando o render).

## Plano

1. **Verificar em runtime** com Playwright na rota `/configuracoes` › aba *Permissões por Tela*: abrir o grupo "Financeiro / Contábil", buscar por "DRE Padrão" e capturar screenshot para confirmar presença/ausência.
2. **Se estiver presente mas escondida** (cenário 2): melhorar a visibilidade no painel — abrir o grupo "Financeiro / Contábil" por padrão quando houver busca ativa, garantir que "DRE Padrão" apareça no topo do grupo e destacar o item quando corresponder à busca.
3. **Se estiver ausente** (cenário 3): corrigir a lógica de `getModule`/filtragem em `PermissoesPorTelaPanel.tsx` para incluir `/contabilidade/dre-padrao`, e adicionar um teste rápido de sanidade que confirme que todos os paths de `ALL_SCREENS` são renderizados.
4. **Se for cache** (cenário 1): forçar re-render (bump de versão / hard reload) e orientar você a limpar cache do preview.
5. Revalidar por Playwright: buscar "DRE Padrão" no campo de busca do painel → deve aparecer com toggles `Visualizar / Editar / Excluir` por perfil, e persistir em `profile_screens` ao marcar.

## Detalhes técnicos

- Arquivos envolvidos: `src/pages/ConfiguracoesPage.tsx` (ALL_SCREENS), `src/components/configuracoes/PermissoesPorTelaPanel.tsx` (agrupamento e render).
- Nenhuma migração é necessária: o registro só é gravado em `profile_screens` quando um toggle é acionado — a ausência de linhas na tabela é normal e não impede a tela de aparecer no painel.
- Nenhuma alteração no backend/API.

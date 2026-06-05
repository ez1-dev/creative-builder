## Objetivo
Fazer o toggle **Excluir** aparecer corretamente em **Configurações > Permissões por Tela**, mantendo a permissão `can_delete` funcionando na tela de Frota.

## O que vou fazer
1. Revisar o fluxo completo da aba **Permissões por Tela** para identificar por que a UI exibida no preview não corresponde ao componente atual.
2. Validar se há condição de renderização, aba/layout antigo, cache de estado ou problema de dados impedindo a terceira opção de aparecer.
3. Ajustar a tela para garantir que cada perfil exiba explicitamente **Ver / Editar / Excluir** na área de permissões da tela selecionada.
4. Confirmar que o salvamento continua enviando `can_delete` para `profile_screens` sem alterar o comportamento de `can_view` e `can_edit`.
5. Verificar visualmente que a tela **/frota** pode receber a nova permissão pela interface.

## Evidências já confirmadas
- O componente `PermissoesPorTelaPanel` já contém o bloco do switch **Excluir**.
- `ConfiguracoesPage` já passa `onToggle` aceitando `can_delete`.
- Os tipos já incluem `can_delete`.
- Portanto, o problema parece estar na renderização efetiva da tela, não na ausência do campo no código digitado.

## Resultado esperado
- Na aba **Permissões por Tela**, ao selecionar uma tela, cada perfil mostra os três controles: **Ver**, **Editar** e **Excluir**.
- O toggle **Excluir** persiste corretamente.
- A permissão de exclusão da **Manutenção de Frota** continua restrita ao novo flag por tela.

## Detalhes técnicos
- Arquivos prováveis: `src/components/configuracoes/PermissoesPorTelaPanel.tsx`, `src/pages/ConfiguracoesPage.tsx`.
- Vou focar só na camada de interface e integração da tela de permissões, sem expandir escopo para outros módulos.
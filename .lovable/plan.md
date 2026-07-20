
## Objetivo

Na tela **Configurações › Personalizar Menus**, a aba **Padrão global (admin)** deve ter exatamente a mesma experiência de edição da aba **Meu usuário** e ganhar um botão para importar o layout pessoal como base do global.

## Verificação da situação atual

Em `src/pages/PersonalizarMenusPage.tsx` a UI de edição já é a mesma para as duas abas — o componente lê `activeLayout` a partir de `scope` (`user` | `global`) e reaproveita todos os controles (renomear, mover, ícones, criar item/submenu/menu, mostrar ocultos, resetar). Ou seja, o **Espelhar UI** já está OK por construção; só precisa validar em runtime que nenhum controle está condicionado a `scope === 'user'` além do necessário e ajustar textos/badges se algo estiver divergindo.

O que **não existe** hoje é o botão para trazer o layout de "Meu usuário" para o "Padrão global".

## Entregas

### 1. Botão "Copiar do meu usuário → global"

- Local: cabeçalho da aba **Padrão global (admin)**, ao lado de **Publicar para todos agora** e **Resetar**.
- Só aparece quando `scope === 'global'` e `isAdmin`.
- Fluxo:
  1. Abre `AlertDialog` de confirmação: "Isso vai substituir o Padrão global pelo layout do seu usuário. Todos os usuários vão ver essa configuração. Deseja continuar?".
  2. Ao confirmar, chama `setLayout('global', () => structuredClone(userLayout))`.
  3. Em seguida chama `publishGlobal()` para atualizar `updated_at`/`updated_by` e disparar realtime.
  4. Toast: "Padrão global atualizado com o layout do seu usuário".
- Desabilita o botão quando `userLayout` estiver vazio (nenhuma customização) — hint no tooltip.

### 2. Paridade de UI entre as abas

- Revisar `PersonalizarMenusPage.tsx` procurando qualquer bloco que dependa de `scope === 'user'` (ex.: seções que só apareçam num escopo). Se algum controle presente em "Meu usuário" não aparecer em "Padrão global", replicar o mesmo elemento com o mesmo comportamento — apenas o texto do badge/aviso muda (azul "Meu usuário" vs âmbar "Global").
- Garantir que o banner de metadata do global (`Última publicação`) continua visível **somente** no escopo global, e o resto (lista de menus, subgrupos, itens ocultos, criar item/submenu/menu, ícones, renomear) é idêntico.
- Sem alteração no `useMenuLayout` — a função `setLayout(scope, updater)` já suporta receber o layout inteiro.

### 3. Sem mudanças de backend

Nada muda em Cloud/RLS. O upsert já existe (`saveGlobal`) e é acionado pelo `setLayout('global', ...)` + `publishGlobal()`.

## Arquivos afetados

- `src/pages/PersonalizarMenusPage.tsx` — adicionar botão + `AlertDialog`, revisar paridade de blocos entre `scope === 'user'` e `scope === 'global'`.

## Validação

1. Como admin, entrar em "Meu usuário", fazer edições (renomear, ocultar, criar submenu).
2. Trocar para "Padrão global", clicar em **Copiar do meu usuário → global**, confirmar.
3. A árvore da aba global deve refletir exatamente o layout pessoal e o campo "Última publicação" deve atualizar.
4. Outro usuário logado deve receber via realtime/refetch e ver o novo layout na sidebar.
5. Todos os controles disponíveis em "Meu usuário" (criar item, submenu, menu, ícones, mostrar ocultos, resetar) devem estar presentes e funcionais no "Padrão global".

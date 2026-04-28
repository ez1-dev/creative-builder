## Adicionar "Passagens Aéreas" na matriz de permissões por tela

A tela `/passagens-aereas` não aparece em **Configurações → Permissões por Tela** porque ela não está cadastrada na lista `ALL_SCREENS` em `src/pages/ConfiguracoesPage.tsx`.

### Mudança

Arquivo: `src/pages/ConfiguracoesPage.tsx`

Adicionar uma entrada na constante `ALL_SCREENS` (linha ~24), logo antes de `/configuracoes`:

```ts
{ path: '/passagens-aereas', name: 'Passagens Aéreas' },
```

### Resultado

- A tela "Passagens Aéreas" passa a aparecer na matriz de permissões.
- Admin pode marcar **Visualizar** / **Editar** por perfil.
- O `useUserPermissions` (já usado em `PassagensAereasPage`) passa a respeitar essas configurações para mostrar/ocultar os botões "Novo registro" e "Compartilhar".

### Fora do escopo

- Não cria automaticamente registros em `profile_screens` para perfis existentes — admin precisa marcar manualmente o acesso por perfil. Se quiser, posso fazer uma migration que conceda visualização ao perfil "Administrador" por padrão.

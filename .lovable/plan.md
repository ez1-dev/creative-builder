## Diagnóstico

- `cesar.moreira@ezortea.com.br` (id `54abd12a-…9e415b`) **não tem** linha em `menu_layout_user` → recebe apenas o `menu_layout_global`.
- O `menu_layout_global` (última alteração 20/07 17:59) está muito mais enxuto do que o menu que você usa no dia a dia: só 14 itens ocultos e 1 subgrupo custom, sem renames/orders.
- O "menu novo" que você vê está salvo no **seu** `menu_layout_user` (renato.stank): 9 hidden, 2 subgrupos custom, com renames e orders.

Ou seja: o Cesar não está herdando o menu novo porque ele **nunca esteve no global** — está só no seu perfil.

## Ação (escopo escolhido: só o Cesar)

Copiar o `layout` de `menu_layout_user` do renato.stank para uma nova linha de `menu_layout_user` do cesar.moreira. Global permanece intacto; nenhum outro usuário é afetado.

SQL a executar via ferramenta de insert:

```sql
INSERT INTO public.menu_layout_user (user_id, layout, updated_at)
SELECT
  '54abd12a-ff67-4c20-90ee-0084ec9e415b'::uuid,
  layout,
  now()
FROM public.menu_layout_user
WHERE user_id = '5281f658-36d4-4976-9f03-813d84531549'::uuid
ON CONFLICT (user_id) DO UPDATE
  SET layout = EXCLUDED.layout,
      updated_at = EXCLUDED.updated_at;
```

## Validação

1. `SELECT updated_at, jsonb_array_length(layout->'hidden') FROM menu_layout_user WHERE user_id = '54abd12a-…9e415b';` deve retornar 9 hidden e timestamp de agora.
2. Pedir ao Cesar para recarregar a aba (ou aguardar — o hook `useMenuLayout` tem realtime em `menu_layout_user` filtrado por `user_id=eq.<id>` e também refaz fetch no `focus`/`visibilitychange`, então costuma atualizar sozinho ao voltar pra aba).

## Observações

- Nenhuma mudança de código. É só uma cópia de dados.
- Se o Cesar quiser depois personalizar o menu dele, continua funcionando normalmente — o que estamos criando é o *ponto de partida* dele igual ao seu.
- Se um dia você quiser que **todos** os usuários novos já venham com esse menu, o caminho é publicar seu layout como global (outro plano).

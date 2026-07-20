## Diagnóstico

Confirmei o que está no ar hoje:

- **Menus personalizados vivem no Cloud** (`menu_layout_global` + `menu_layout_user`), não no bundle. RLS já permite qualquer usuário autenticado ler o layout global.
- **`useMenuLayout` só busca uma vez, na montagem** (`useEffect` com `[userId, tick]`). Não há realtime, nem refetch on focus, nem invalidação por evento. Enquanto o PWA fica aberto (típico em celular, onde o app fica em background por dias), o layout global carregado no boot **nunca mais é reconsultado**.
- **PWA sem service worker**: o `index.html` sai com `no-cache, must-revalidate`, o bundle é hash-nomeado. Existe um `UpdateNotifier` que faz polling do `/index.html` a cada 60s e detecta troca de hash — mas ele só dispara para *bundles* novos, não para mudanças de dados no Cloud (o layout de menu é dado, não código).
- Sintoma para o usuário: admin altera menu → em outro dispositivo o PWA continua mostrando o layout antigo até o usuário fechar totalmente o app e reabrir (o que raramente acontece em PWA instalado).

Ou seja, **não é problema de cache de bundle**; é falta de re-sincronização do layout com o Cloud enquanto o app está aberto.

## Plano

### 1. Refetch automático do layout de menu

Em `src/hooks/useMenuLayout.tsx`, adicionar três gatilhos que chamam `refresh()`:

- **Ao focar a janela / voltar do background** (`visibilitychange` + `focus`) — cobre o caso "usuário volta pro PWA depois de horas".
- **Realtime do Supabase**: `supabase.channel('menu_layout').on('postgres_changes', { event: '*', schema: 'public', table: 'menu_layout_global' }, …)` invalida globalLayout na hora que o admin salva. Fazer o mesmo para `menu_layout_user` filtrando por `user_id=eq.${userId}` (útil se o usuário editar em outro dispositivo).
- **Polling leve de fallback** a cada 5 min, só quando a aba está visível, para redes/ambientes onde o realtime não chegar.

Separar `loadGlobal`/`loadUser` para permitir refetch parcial (ex.: realtime só do global). Manter dedupe: se `layout` não mudou (hash JSON), não re-renderiza.

### 2. Botão manual "Sincronizar menus"

Em `PersonalizarMenusPage.tsx`, expor um botão pequeno "Sincronizar agora" que chama `refresh()`. Serve como escape hatch e ajuda a testar.

### 3. Aviso passivo quando layout muda em outra sessão

Quando o realtime detectar mudança no `menu_layout_global`, mostrar um toast discreto: "Menus atualizados pelo administrador" (sem interromper o usuário). Opcional — posso deixar silencioso se preferir.

### 4. Sanidade do `UpdateNotifier` para o PWA instalado

Não mexer na lógica; só confirmar por telemetria (console.info já existe) que ele está rodando dentro do PWA. Se depois aparecer que **também há bundle antigo** rodando, aí sim entramos numa segunda rodada de plano (kill-switch service worker) — mas o problema descrito hoje é resolvido só com os itens 1–3.

## Fora de escopo

- Não vou introduzir service worker / vite-plugin-pwa nesta rodada (regra do projeto: só adicionar SW se o usuário pedir offline explicitamente).
- Não vou mexer em RLS nem em `menu_layout_*` — leitura para authenticated já está OK.
- Não vou tocar em `screenCatalog` / permissões.

## Pergunta rápida

Quer o toast "Menus atualizados pelo administrador" (item 3) **ativo** ou **silencioso** (só recarrega o sidebar sem avisar)?

## Adicionar telas do DRE Studio em "Permissões por Tela"

Em `src/pages/ConfiguracoesPage.tsx`, dentro da constante `ALL_SCREENS` (linhas 34–97), adicionar três novas entradas logo abaixo da linha `/bi/contabilidade/dre` (mantendo o Balanço, que já existe):

```ts
{ path: '/contabilidade/dre-studio',              name: 'DRE Studio — Visão Geral' },
{ path: '/contabilidade/dre-studio/modelos',      name: 'DRE Studio — Modelos' },
{ path: '/contabilidade/dre-studio/modelos/novo', name: 'DRE Studio — Novo Modelo' },
```

Isso faz com que aparecem no seletor de telas em Configurações → Permissões por Tela, permitindo marcar `can_view/can_edit/can_delete` por perfil. As demais rotas do Studio (`/orcamento`, `/resultado`) já ficam cobertas pelo prefixo se necessário no futuro; se quiser, podemos incluí-las também — me avise.

Nenhuma outra alteração é necessária: `Balanço Patrimonial` (`/contabilidade/balanco`) e `Contabilidade — DRE` (`/bi/contabilidade/dre`) já estão listados. O `PermissoesPorTelaPanel` já lê de `ALL_SCREENS` e grava em `profile_screens` com upsert por `profile_id,screen_path`.

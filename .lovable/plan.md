# Publicar "Auditoria Apontamento Genius" em produção

A página já existe (`/auditoria-apontamento-genius`), está registrada no `App.tsx`, no menu (`AppSidebar.tsx`) e no `screenCatalog.ts`. Para levá-la à produção, basta publicar o app — os itens de menu, rota e página irão junto com o deploy do frontend.

## Passo único

- Executar `preview_ui--publish` para republicar o projeto. As últimas edições já commitadas serão incluídas no deploy.

## Verificações antes de publicar

- Rodar `security--get_scan_results` para checar findings críticos pendentes.
- Se não houver scan recente, rodar `security--run_security_scan` e aguardar antes de publicar.

## Fora de escopo

- Nenhuma alteração de código, rotas, permissões, backend ou API.
- Não altera visibilidade (público/privado) — se necessário, ajustar depois via `publish_settings--update_visibility`.

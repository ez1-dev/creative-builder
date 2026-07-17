# Ocultar card "Backend ERP online" quando tudo OK

## Onde aparece

Página `/monitor-usuarios-senior` (arquivo `src/pages/MonitorUsuariosSeniorPage.tsx`, linhas 533–545). O `BackendStatusCard` está sendo exibido para admin/RENATO mesmo quando a API está online, mostrando: título "Backend ERP online", URL do ngrok, "Última verificação", e botões "Testar conexão", "Atualizar API URL", "Tentar novamente".

## Alteração

- `src/pages/MonitorUsuariosSeniorPage.tsx`: mudar a condição de render do `BackendStatusCard` para exibir **apenas quando houver erro/carregando**, ocultando também para admin.
  - Antes: `{(connStatus.kind !== 'online' || canDisconnect) && (...)}`
  - Depois: `{connStatus.kind !== 'online' && (...)}`
- Diagnóstico e troca de URL continuam disponíveis pela página `/configuracoes` (que já tem "Testar conexão" e edição da URL).
- Nenhum outro comportamento alterado: `testHealth`, `load`, `UpdateApiUrlDialog` e efeitos permanecem.

## Fora de escopo

- Não remover o componente `BackendStatusCard` nem seus usos em outras telas.
- Não mexer em `/configuracoes` nem em rotas de RH.

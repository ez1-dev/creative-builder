## Diagnóstico

O card "Backend ERP online / OK / Conexão com a API ERP funcionando normalmente" é o `BackendStatusCard` renderizado em `src/pages/MonitorUsuariosSeniorPage.tsx` (linhas 458–467). Hoje ele aparece **sempre**, inclusive quando a conexão está OK — o que polui a tela para usuários finais.

A intenção do card é **diagnóstico** (mostrar URL do ngrok, botão "Atualizar API URL", "Testar conexão"). Faz sentido manter visível só quando há problema, ou para quem precisa diagnosticar (admin/RENATO).

## Mudança

Em `src/pages/MonitorUsuariosSeniorPage.tsx`, condicionar o `<BackendStatusCard>`:

- **Esconder** quando `connStatus.kind === 'online'` para usuários comuns.
- **Continuar mostrando sempre** para `isAdmin` ou `RENATO` (`canDisconnect`), já que são quem opera/diagnostica o backend.
- Quando houver erro (`offline`, `unauthorized`, `not_found`, `server_error`, `loading`), continua aparecendo para **todos** — afinal o card é a forma de tentar reconectar.

Trecho alvo (substituir linhas 458–467):

```tsx
{/* Status do backend — escondido para usuários comuns quando estiver tudo OK.
    Admin/RENATO continuam enxergando para diagnosticar. Erros aparecem para todos. */}
{(connStatus.kind !== 'online' || canDisconnect) && (
  <BackendStatusCard
    status={connStatus.kind === 'idle' && loading ? { kind: 'loading' } : connStatus}
    apiUrl={apiUrl}
    onTest={testHealth}
    onChangeUrl={() => setUrlDialogOpen(true)}
    onRetry={load}
    testing={testing}
    retrying={loading}
  />
)}
```

## O que NÃO muda

- O card continua visível em qualquer cenário de erro/offline/401/404/loading para todos os usuários.
- Admin e RENATO continuam vendo o card sempre.
- A lógica interna do `BackendStatusCard`, do health-check e do diálogo "Atualizar API URL" não muda.
- KPIs, filtros, tabela e botão Desconectar não mudam.

## Validação

1. Logar como usuário comum com backend online → o card **não** aparece. A tela mostra direto KPIs e tabela.
2. Logar como admin ou RENATO com backend online → o card continua visível (para conseguir trocar a URL ngrok quando precisar).
3. Derrubar o ngrok / forçar 401 / 404 → o card volta a aparecer para **todos** os usuários, com botões de reconexão.

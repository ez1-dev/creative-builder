# Investigar aviso de SID desabilitado

O aviso é totalmente **orientado pela resposta do backend** — o frontend só o renderiza quando o FastAPI diz que está off. Antes de qualquer alteração de código, preciso confirmar o que está sendo devolvido para o navegador.

## O que já se sabe pelo código

- Fonte única do banner: hook `useSidStatus` (`src/hooks/requisicoes/index.ts`) → `requisicoesApi.pingSid()` → `GET /api/requisicoes/sid/ping`.
- `IntegracaoStatusChip` e `IntegracaoOfflineBanner` só exibem quando **uma** destas condições é verdadeira:
  - `sid_habilitado === false`
  - `ger_sid.wsdl_ok === false`
  - `cha_separacao.wsdl_ok === false`
  - `detail` recebido de um 503 tratado
- O botão "Enviar" fica desabilitado por `useSidWriteEnabled()`, que segue exatamente as mesmas flags.
- Não há mock/override no cliente que force o banner — o retorno vem do FastAPI configurado em `getApiUrl()`.
- Fluxos gravadores (`sidRequisitarLote`, `sidBaixarComponentes`, etc.) também podem devolver HTTP 503 do próprio backend; nesse caso o cliente lança `IntegracaoDesabilitadaError` com o `detail` do backend e mostra o mesmo aviso.

Ou seja, a mensagem *não* é um estado local desatualizado: ela reflete o `sid/ping` real. A investigação precisa capturar essa resposta.

## Passos da investigação

1. **Confirmar a sessão do usuário no preview.** O session replay mostra a tela de login e as chamadas Supabase retornaram `session_not_found` (403). Se o usuário estiver deslogado, o ping ao FastAPI pode estar sendo respondido sem token e o backend pode devolver `sid_habilitado=false` como fallback. Preciso do usuário logado (Microsoft) antes de continuar.
2. **Capturar a resposta real do `GET /api/requisicoes/sid/ping`.** Duas formas complementares:
   - Pedir print da aba **Network** do navegador filtrando por `sid/ping` (status, corpo JSON).
   - Reproduzir aqui via Playwright headless após restaurar a sessão, abrir `/requisicoes/nova-op` e logar a resposta do endpoint.
3. **Interpretar o JSON:**
   - Se `sid_habilitado=false` → configuração no backend (`SID_HABILITADO`); ação é no FastAPI, não no frontend.
   - Se `sid_habilitado=true` porém `ger_sid.wsdl_ok=false` ou `cha_separacao.wsdl_ok=false` → o WSDL do Senior não está acessível; olhar `ger_sid.erro`/`cha_separacao.erro` retornados no mesmo payload.
   - Se resposta for HTTP 503 → capturar o `detail`.
   - Se o navegador estiver recebendo 401/403/404 no `sid/ping` (ex.: token expirado, path errado, CORS), o React Query devolve erro e o banner não deveria aparecer — nesse caso o aviso viria de um 503 em outra chamada (por ex. `sidRequisitarLote`); precisamos identificar qual request originou.
4. **Correlacionar com o backend.** Uma vez identificado o motivo (flag desligada vs. WSDL fora), a correção é operacional no FastAPI:
   - Variável `SID_HABILITADO=true` no ambiente.
   - Conectividade / credenciais do `co_ger_sid` e `cha_separacao`.
5. **Relatar o achado ao usuário** com o JSON exato do ping e o próximo passo (backend ou frontend). Só depois avaliar se há algum ajuste de UX (ex.: mostrar o `erro` do WSDL para admins direto no chip, hoje ele aparece só no diálogo técnico).

## O que este plano **não** faz

- Não altera código de frontend antes de confirmar o retorno do backend — o comportamento atual está correto conforme a spec (banner reflete `/sid/ping`).
- Não mexe em configuração do FastAPI (fora do escopo do projeto Lovable); apenas aponta o ajuste necessário.

## Detalhes técnicos

- Endpoint: `GET {VITE_API_BASE}/api/requisicoes/sid/ping` com header `ngrok-skip-browser-warning: true` e `Authorization: Bearer <erp_token>` quando presente.
- Contrato esperado (`SidStatusResponse`):

```text
{
  sid_habilitado: boolean,
  ger_sid: { url, operacao, wsdl_ok, erro? },
  cha_separacao: { url, operacao, wsdl_ok, erro? },
  proximo_passo?: string
}
```

- Cache/refetch: `staleTime 60s`, `refetchInterval 120s`, `refetchOnWindowFocus true`. Assim que o backend responder com tudo `true`, o banner some sem reload.

## Entrega da investigação

- Mensagem final ao usuário contendo: status HTTP do `sid/ping`, JSON recebido, causa (flag ou WSDL) e onde ajustar (backend). Se for necessário mudança de UX no frontend, abrir plano separado.

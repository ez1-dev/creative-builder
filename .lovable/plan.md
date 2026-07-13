Ajustar frontend da página **Contabilidade — DRE** para usar `VITE_CONTABIL_API_URL` como variável oficial e adicionar diagnóstico visível de conexão. Nenhuma alteração de lógica de negócio.

## 1. Variável de ambiente

- Oficial: **`VITE_CONTABIL_API_URL=https://dreconfiguravel.ngrok.app`**
- Fallback (compat): `VITE_DRE_API_URL` continua sendo lido, mas com prioridade menor.
- Não editar `.env` (auto-gerado). A configuração fica em `.env.local` do usuário; o cliente já cai no default se ausente.

Em `src/lib/contabil/contabilApi.ts`:
- Inverter prioridade em `getContabilBaseUrl()`: `VITE_CONTABIL_API_URL` primeiro, `VITE_DRE_API_URL` depois, `DEFAULT_CONTABIL_URL` por último.
- Adicionar guarda extra: se a URL final apontar para `*.supabase.co`, ignorar e logar `console.warn` (Supabase nunca é a API contábil).
- Guardas existentes de `:8090` e `api-erp-renato.ngrok.app` já estão implementadas — manter.

## 2. Diagnóstico visível na página

Criar `src/components/contabil/DreApiDiagnostico.tsx` renderizado no topo do `DrePage` (acima do `DreMetaBar`), usando `pingContabilHealth()` já existente + `useDreApiHealth` estilo `useQuery`.

Layout (uma faixa fina, tokens semânticos, sem cor hardcoded):

```
API contábil: https://dreconfiguravel.ngrok.app   [ícone status]  <mensagem>   [Testar conexão]
```

Mensagens fixas conforme resultado do `pingContabilHealth()`:

| Estado | Mensagem |
|---|---|
| `ok:true` | **API contábil conectada** |
| `status === 404` | **O domínio está online, mas a rota contábil não foi encontrada. Verifique se o túnel está apontando para a API integrada da porta 8070.** |
| `status === 'network' \| 'timeout' \| 0` | **API contábil indisponível. Verifique o túnel ngrok e a execução do backend.** |
| `status === 401` | **Sessão expirada — refaça o login.** |
| outros | mostrar `HTTP <status>` cru + `details` |

Botão "Testar conexão" refaz o health check e invalida `['dre-matriz']`.

## 3. Limpeza (search)

Confirmado por `rg`: nenhuma referência ativa a `:8090`, `localhost:8090` ou `api-erp-renato.ngrok.app` em código de runtime da DRE (apenas guardas defensivas em `contabilApi.ts` e mensagem de toast em `ConfiguracoesPage.tsx` alertando o usuário — mantém-se). Nada a remover.

## 4. Documentação

Atualizar `docs/backend-dre-api-integrada.md`:
- Variável oficial passa a ser `VITE_CONTABIL_API_URL`; `VITE_DRE_API_URL` marcado como legado/aceito por compat.

## 5. Segurança (verificação, sem código)

Rodar `rg "SERVICE_ROLE|JWT_SECRET|SENIOR_DB_PASSWORD" src` para garantir que nenhuma chave privada está no bundle. `VITE_SUPABASE_*` (auto-geradas, publishable) permanecem — são necessárias para o Auth e não são chaves privadas.

## Fora de escopo

- Backend FastAPI (rota 404 já reportada anteriormente é responsabilidade do backend).
- Editar `.env` (arquivo auto-gerado pelo Cloud).
- Qualquer mudança em cálculo, matriz, conciliação ou modelos.

## Critérios de aceite

- `VITE_CONTABIL_API_URL` é a variável primária lida pelo cliente contábil.
- Nenhuma chamada da DRE vai para porta 8090, `api-erp-renato.ngrok.app` ou `*.supabase.co`.
- Página exibe faixa com URL ativa, ícone de status e uma das três mensagens padronizadas.
- Botão "Testar conexão" refaz o health check.
- Nenhuma chave privada (`SERVICE_ROLE`, `JWT_SECRET`, `SENIOR_DB_PASSWORD`) aparece em `VITE_*` ou no bundle.
- `tsgo` continua verde.

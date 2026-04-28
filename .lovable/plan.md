## Análise do erro

A tela **Reserva Nº de Série** chama o backend FastAPI externo via `api.get('/api/numero-serie/contexto', ...)` (rota privada do ERP, exposta por ngrok). O erro **"Failed to fetch"** é lançado pelo `fetch()` do navegador **antes** de obter qualquer resposta HTTP — ou seja, a requisição nem chegou ao servidor.

Isso **não** é bug de código no frontend. O `src/lib/api.ts` está enviando corretamente:
- `Content-Type: application/json`
- `ngrok-skip-browser-warning: true`
- `Authorization: Bearer <token ERP>`

Causas possíveis (em ordem de probabilidade):

1. **Túnel ngrok do FastAPI caiu / mudou de URL** — mais comum. Toda vez que o backend é reiniciado sem domínio fixo, a URL muda e a `VITE_API_BASE_URL` configurada no projeto fica apontando para um endereço inexistente.
2. **Backend FastAPI offline** — processo parado na máquina onde roda o ERP.
3. **CORS bloqueando o preflight** — o backend precisa liberar a origem `https://id-preview--f53f5f3e-218b-4392-b75e-159397053246.lovable.app` (preview) e `https://ez-erp-ia.lovable.app` (publicado).
4. **Aviso "Visit Site" do ngrok** — sem o header `ngrok-skip-browser-warning` o ngrok devolve HTML em vez do JSON. Já está no código, mas se houver versão antiga do ngrok pode ainda assim recusar.
5. **Token ERP expirado** — geralmente cai como 401 (não "Failed to fetch"), mas em alguns proxies vem como network error.

## Plano de ação

### Passo 1 — Confirmar se o backend está acessível
- Abrir uma nova aba do navegador e acessar diretamente a URL base do ERP + `/health` (ou `/docs`) — se também der erro/timeout, o backend ou o ngrok está fora do ar.
- Se for apenas a Reserva Nº de Série que falha (mas Faturamento, Estoque, etc funcionam), o problema é específico das rotas `/api/numero-serie/*` no backend.

### Passo 2 — Atualizar a URL do backend (se ngrok mudou)
- Ir em **Configurações → API ERP** e colar a nova URL do ngrok.
- Alternativa: atualizar a env `VITE_API_BASE_URL` no Lovable.

### Passo 3 — Melhoria de UX no frontend (opcional, podemos fazer agora)
Para tornar este tipo de erro mais claro ao usuário, posso:
- Detectar o `TypeError: Failed to fetch` em `src/lib/api.ts` e converter para uma mensagem amigável: **"Não foi possível conectar ao servidor ERP. Verifique se o backend FastAPI está online e se a URL configurada em Configurações está correta."**
- Adicionar um botão "Testar conexão" no `ErpConnectionAlert` que faz um GET em `/health` e mostra o resultado.

### Passo 4 — CORS (somente se servidor responde mas navegador bloqueia)
Se em DevTools aparecer "blocked by CORS policy", o backend FastAPI precisa de:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://id-preview--f53f5f3e-218b-4392-b75e-159397053246.lovable.app",
        "https://ez-erp-ia.lovable.app",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## O que preciso de você antes de mexer no código

Por favor, confirme:

1. **Outras telas que dependem do ERP** (ex.: Faturamento Genius, Painel Compras, Estoque) também estão dando "Failed to fetch", ou só a Reserva Nº de Série?
2. Em **Configurações → API ERP**, qual URL está cadastrada e ela responde se você abrir `<URL>/docs` no navegador?
3. Quer que eu já implemente a melhoria do **Passo 3** (mensagem amigável + botão "Testar conexão") enquanto você verifica o backend?

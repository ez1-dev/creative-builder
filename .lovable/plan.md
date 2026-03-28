

# Fixar URL padrão da API para o ngrok

## Problema
O front roda no preview do Lovable (não é localhost), então `http://localhost:8000` nunca vai funcionar. O usuário precisa configurar manualmente toda vez.

## Solução

### 1. Criar arquivo `.env.local` na raiz do projeto
```
VITE_API_URL=https://flakily-wanning-faye.ngrok-free.dev
```

Isso faz com que `import.meta.env.VITE_API_URL` retorne a URL do ngrok automaticamente, eliminando a necessidade de configurar manualmente na tela de login.

### 2. Nenhuma mudança em `src/lib/api.ts`
O código já lê `import.meta.env.VITE_API_URL` como fallback — basta o `.env.local` existir.

## Observação
- A URL do ngrok muda a cada reinício (plano gratuito). Quando mudar, atualize o `.env.local` ou use "Configurar API" na tela de login.
- O CORS na FastAPI com `allow_origins=["*"]` continua sendo necessário no backend.


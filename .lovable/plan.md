# Tela branca pós-login — MAIANE.SAURIN

## Diagnóstico

Confirmado no banco:

- A usuária `maiane.saurin@ezortea.com.br` **existe**, está **aprovada** e tem `erp_user` vinculado.
- Os perfis de acesso dela liberam: `/compras-produto`, `/notas-recebimento`, `/painel-compras`, `/passagens-aereas`. **Não tem permissão em `/estoque`**.
- O fluxo de login força redirecionamento para `/estoque` (em `LoginPage` e `AuthCallback`).
- O `ProtectedRoute` (src/components/ProtectedRoute.tsx) faz: se o usuário tem permissões mas não pode ver a rota, redireciona de volta para `/estoque` → cai no mesmo bloqueio → **loop / tela branca**.

O 404 em `/api/fornecedores` que apareceu no log é **consequência**, não causa: alguma tela tenta carregar fornecedores enquanto a navegação está travada.

## O que vamos mudar

Tudo é frontend (presentation), nenhuma regra de negócio nem schema muda.

### 1. Função utilitária `getFirstAllowedPath`
Em `src/hooks/useUserPermissions.ts`, expor `firstAllowedPath` (primeira rota com `can_view = true`, em ordem alfabética estável; preferindo uma lista priorizada: `/painel-compras`, `/compras-produto`, `/notas-recebimento`, `/passagens-aereas`, depois qualquer outra).

### 2. `ProtectedRoute` deixa de mandar pra `/estoque`
- Se o usuário tem permissões mas não pode ver a rota → redireciona para `firstAllowedPath`.
- Se o usuário **não tem nenhuma permissão** → renderiza uma tela "Sem acesso liberado" (mesmo padrão visual do "Acesso Pendente" em `AppLayout`), com botão **Sair**. Sem isso, qualquer rota fica em branco.

### 3. Redirecionos pós-login dinâmicos
- `LoginPage.tsx`: ao detectar `isAuthenticated`, navegar para `firstAllowedPath` (fallback `/login` se não houver nenhuma).
- `AuthCallback.tsx`: idem após confirmar a sessão Microsoft.
- `Index.tsx` (rota `/`): mesmo destino dinâmico.

### 4. Bônus rápido: warning do `MicrosoftLogo`
O console mostra "Function components cannot be given refs" porque o `Button` do shadcn passa `ref` para o filho via `Slot`-like. Envolver `MicrosoftLogo` em `React.forwardRef` para silenciar o warning (não é a causa da tela branca, mas aparece no log relacionado à mesma página).

## Detalhes técnicos

- Não tocar em `src/integrations/supabase/*` nem `.env`.
- Manter `PUBLIC_FALLBACK_PATHS` em `AppLayout` intacto.
- A nova tela "Sem acesso liberado" reaproveita classes Tailwind/tokens já usados no bloco "Acesso Pendente".
- Validação: após o build, simular usuário sem `/estoque` → deve cair direto em `/painel-compras` (no caso da MAIANE) sem flash branco.

## Fora do escopo

- Não vou alterar nada do backend FastAPI nem do endpoint `/api/fornecedores` — o 404 some sozinho assim que ela parar de ser jogada para uma rota proibida.
- Não vou mexer no Electron / vite.config.ts (já corrigido na rodada anterior).

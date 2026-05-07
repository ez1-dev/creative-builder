## Causa raiz

A rota `/biblioteca-bi` está **sem proteção de autenticação** em `src/App.tsx` (linhas 85–86), enquanto todas as outras páginas usam `<ProtectedRoute>`. Você abre o catálogo deslogado, clica em **Aplicar**, e:

1. O dialog detecta `supabase.auth.getUser() === null` e mostra o aviso amarelo "Você não está autenticado".
2. O botão **Aplicar à página** fica desabilitado (`canSave` exige `authed === true`).
3. Mesmo se passasse, o insert em `bi_user_widgets` seria rejeitado pelo RLS (`auth.uid() = user_id`).

Confirmado por evidência: você está em `/login` agora, e `SELECT count(*) FROM bi_user_widgets` = **0 registros**. A tabela e a RLS estão corretas — o problema é só de sessão expirada + rota desprotegida.

## Correção

Envolver `/biblioteca-bi` (e o alias `/bi-components-demo`) com `<ProtectedRoute path="/biblioteca-bi">`, igual às demais páginas. Resultado: ao abrir o link você é redirecionado para `/login`; após autenticar, volta ao catálogo já com sessão ativa, o aviso amarelo some e o botão **Aplicar à página** funciona normalmente.

## Arquivo a editar

- `src/App.tsx` linhas 85–86: trocar
  ```tsx
  <Route path="/bi-components-demo" element={<BiComponentsDemoPage />} />
  <Route path="/biblioteca-bi" element={<BiComponentsDemoPage />} />
  ```
  por:
  ```tsx
  <Route path="/bi-components-demo" element={<ProtectedRoute path="/biblioteca-bi"><BiComponentsDemoPage /></ProtectedRoute>} />
  <Route path="/biblioteca-bi" element={<ProtectedRoute path="/biblioteca-bi"><BiComponentsDemoPage /></ProtectedRoute>} />
  ```

Sem mudanças de schema, RLS, ou dialog. Só uma linha de roteamento.

## Verificação

Após aplicar: abrir `/biblioteca-bi` deslogado → redireciona para `/login` → após login, retorna ao catálogo, o banner amarelo do dialog desaparece e o **Aplicar à página** salva normalmente em `bi_user_widgets`.

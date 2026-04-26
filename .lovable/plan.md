# Plano: Hardening do UpdateNotifier

## Objetivo
Garantir, com testes automatizados e logs estruturados, que o modal de atualização:
1. **Nunca** exiba a string literal `"novo build"` no campo de versão (`Nova: vX.Y.Z`).
2. **Sempre** mostre o sufixo `(novo build)` quando a atualização for apenas troca de hash do bundle (sem mudança de `app_version`).
3. **Sempre** mostre apenas `vX.Y.Z` (sem sufixo) quando for mudança real de versão vinda de `app_settings.app_version`.

## Mudanças

### 1. `src/components/UpdateNotifier.tsx` — Logs estruturados
Adicionar logs `console.info` com prefixo `[UpdateNotifier]` em pontos-chave:
- Ao detectar mudança de `app_version` no banco: `{ type: 'version-change', from, to }`
- Ao detectar mudança de hash do bundle: `{ type: 'bundle-change', from, to, displayedVersion }`
- Ao montar o badge: `{ type: 'render', latestVersion, bundleOnlyUpdate, label }`
- Ao clicar em "Atualizar agora": `{ type: 'refresh', latestVersion, bundleOnlyUpdate }`

Também extrair a função pura `formatVersionLabel(latestVersion, currentVersion, bundleOnlyUpdate)` que retorna a string final exibida (`v1.0.3` ou `v1.0.3 (novo build)`). Isso facilita o teste unitário e elimina a possibilidade de `"novo build"` vazar para o lugar errado.

Invariantes garantidas pela função:
- Se `latestVersion` for falsy, inválido ou igual ao literal `"novo build"`, faz fallback para `currentVersion`.
- Sempre prefixa com `v`.
- Sufixo `(novo build)` somente quando `bundleOnlyUpdate === true`.

### 2. Novo arquivo `src/components/__tests__/UpdateNotifier.test.tsx`
Testes cobrindo:

**a) `formatVersionLabel` (unitário, puro):**
- Versão real → `v1.0.3`
- Versão real + bundleOnly → `v1.0.3 (novo build)`
- `latestVersion = null` + bundleOnly → `v{CURRENT} (novo build)` (nunca `novo build` solto)
- `latestVersion = "novo build"` (regressão) → cai para `v{CURRENT}`, sem string literal
- `latestVersion = ""` → cai para `v{CURRENT}`

**b) Componente (render, com `supabase` e `fetch` mockados):**
- Mock de `app_settings` retornando versão diferente da atual → modal abre, label = `v{remote}` sem sufixo `(novo build)`.
- Mock de `app_settings` retornando versão igual + `/index.html` com hash novo → modal abre, label = `v{CURRENT} (novo build)`.
- Mock de versão igual + hash igual → modal **não** abre.
- Garantir via `screen.queryByText` que o texto literal `"Nova: novo build"` **nunca** aparece (sem o `v`).

### 3. Setup de mocks
Reaproveitar `src/test/setup.ts`. Mockar:
- `@/integrations/supabase/client` → `from().select().eq().maybeSingle()` retornando dados configuráveis por teste.
- `global.fetch` → resposta de `/index.html` com `<script src="/assets/index-XXXX.js">`.
- `localStorage` (jsdom já fornece) — limpar entre testes.

## Validação
- Rodar `bunx vitest run src/components/__tests__/UpdateNotifier.test.tsx`.
- Todos os testes devem passar.
- Logs em produção permitirão rastrear, via console do navegador, exatamente qual ramo (versão vs bundle) disparou o modal — útil para depurar relatos futuros.

## Arquivos
- editar: `src/components/UpdateNotifier.tsx`
- criar: `src/components/__tests__/UpdateNotifier.test.tsx`

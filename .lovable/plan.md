## Problema

Ao clicar em **Detalhes** na aba "Usuários" do módulo Gestão SGU, a tela inteira fica em branco (sem header, sem sidebar, sem conteúdo). Isso indica uma exceção durante o render que sobe acima de qualquer error boundary — atualmente o app **não tem nenhum ErrorBoundary**, então qualquer throw em render derruba toda a árvore React.

## Causa provável

O handler `handleVerDetalhes` faz `Promise.all([getUsuario(codusu), getResumoAcessos(codusu)])`:

- `getUsuario` valida se `codusu` é numérico e dispara toast/throw amigável.
- `getResumoAcessos` **não valida** — monta a URL `/api/sgu/usuarios/{codusu}/resumo-acessos` mesmo com `codusu` string (login textual). O backend devolve 422/500 com payload inesperado, e em alguns casos o objeto de resposta normalizado contém campos que o JSX do `<Sheet>` tenta renderizar diretamente (ex.: `detalheResumo.tabelas` chega como objeto não-array, ou `detalheUsr` parcialmente preenchido com tipos inesperados), gerando um throw em render.

Além disso, quando o backend devolve 401, `api.logout()` é chamado, mas isso só limpa o token do ERP — não deveria, sozinho, causar tela branca. O combinado de Promise.all rejeitando + Sheet aberto + dados parciais é o que provoca o crash visual.

## Plano

1. **Adicionar ErrorBoundary global** (`src/components/ErrorBoundary.tsx`) e envolver `<App>` em `src/main.tsx`. Sempre que algo lançar em render, mostra fallback "Algo deu errado" com botão "Recarregar" em vez de tela branca total. Isto resolve a classe inteira de bugs futuros, não só este.

2. **Endurecer `handleVerDetalhes`** em `src/components/sgu/SguUsuariosTab.tsx`:
   - Validar `codusuValido(u)` antes de abrir o Sheet (já que botão pode ter clique programático).
   - Trocar `Promise.all` por `Promise.allSettled` para que falha em uma das chamadas não derrube a outra.
   - Guardar erro em estado `detalheErro` e exibir mensagem dentro do Sheet em vez de ficar `null`.

3. **Validar codusu em `getResumoAcessos`** em `src/lib/sguApi.ts`, igual já é feito em `getUsuario` (rejeita cedo com toast amigável quando não é numérico).

4. **Defesa no JSX do Sheet**:
   - Garantir que `detalheResumo?.tabelas` é tratado como array (`Array.isArray(...) ? ... : []`).
   - Coagir `detalheUsr.codusu` para string ao renderizar.
   - Renderizar bloco de erro quando `detalheErro` estiver setado.

5. **Logar payload bruto** das duas respostas (`getUsuario` detalhe e `getResumoAcessos`) no console quando abrir Detalhes, para facilitar diagnóstico futuro caso o backend retorne formato inesperado.

## Detalhes técnicos

**`src/components/ErrorBoundary.tsx`** (novo): classe React com `componentDidCatch` chamando `logError({ module: 'react/error-boundary', ... })` e fallback usando tokens semânticos (`bg-background`, `text-foreground`, `border-destructive`).

**`src/main.tsx`**: envolver `<App />` com `<ErrorBoundary>`.

**`SguUsuariosTab.tsx`** — substituição do handler:

```ts
const handleVerDetalhes = async (u: SguUsuario) => {
  if (!codusuValido(u)) {
    toast.error('Código de usuário inválido neste registro.');
    return;
  }
  const cod = Number(u.codusu);
  setDetalheOpen(true);
  setDetalheLoading(true);
  setDetalheUsr(null);
  setDetalheResumo(null);
  setDetalheErro(null);
  const [resU, resR] = await Promise.allSettled([getUsuario(cod), getResumoAcessos(cod)]);
  if (resU.status === 'fulfilled') setDetalheUsr(resU.value);
  if (resR.status === 'fulfilled') setDetalheResumo(resR.value);
  const firstErr = [resU, resR].find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
  if (firstErr) setDetalheErro(firstErr.reason?.message ?? 'Falha ao carregar detalhes');
  setDetalheLoading(false);
};
```

E passar `u` em vez de `u.codusu` nos botões.

**`sguApi.ts`** — `getResumoAcessos`:

```ts
export async function getResumoAcessos(codusu: number): Promise<ResumoAcessos> {
  if (!Number.isFinite(Number(codusu))) {
    const e: any = new Error('Código de usuário inválido (não numérico).');
    e.statusCode = 400;
    toast.error(e.message);
    throw e;
  }
  // ... resto igual
}
```

## Arquivos afetados

- `src/components/ErrorBoundary.tsx` (novo)
- `src/main.tsx` (envolver App)
- `src/components/sgu/SguUsuariosTab.tsx` (handler + JSX defensivo)
- `src/lib/sguApi.ts` (validação em `getResumoAcessos`)

## Fora de escopo

- Não toca no backend nem na documentação `docs/backend-sgu-codusu-bug.md` — o bug do `codusu` continua documentado lá e a correção real ainda depende do backend.

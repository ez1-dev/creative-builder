## Problema

O painel "Detalhes do usuário" mostra `[object Object]` no campo **Código** e todos os outros campos como `—`. Isto significa que o objeto retornado por `GET /api/sgu/usuarios/{codusu}` não tem o mesmo formato plano da listagem; provavelmente vem aninhado, algo como:

```json
{ "usuario": { "codusu": 123, "nomusu": "fulano", ... }, "extras": ... }
```

Em `normalizarUsuario`, a lista de candidatos do `codusu` inclui literalmente a chave `'usuario'`, então `pickFirst` retorna o **objeto** inteiro como valor do `codusu`. `Number(obj)` vira `NaN` → cai no fallback `codRaw` → React renderiza objeto → `[object Object]`. Como nenhum campo plano é encontrado no nível raiz, o resto fica `null`/`''`.

Detalhe extra: também não temos visibilidade do payload bruto desse endpoint (só vemos no console do navegador, não nos logs do agente).

## Plano

1. **Tornar `normalizarUsuario` robusto a payloads aninhados** em `src/lib/sguApi.ts`:
   - Antes de mapear, detectar wrapper comum: se `u.usuario` for objeto, fazer merge `{ ...u.usuario, ...u }` (campos do nível superior têm prioridade) e usar como base.
   - Aplicar o mesmo para `u.dados` e `u.data` quando forem objetos não-array.
   - Remover `'usuario'` da lista de candidatos do `codusu` para evitar colisão com o wrapper.
2. **Logar payload bruto** do `GET /api/sgu/usuarios/{codusu}` em `getUsuario` (igual ao que já existe em `getUsuarios`) para diagnóstico imediato no console quando o formato for diferente do esperado.
3. **Defesa final no JSX** em `src/components/sgu/SguUsuariosTab.tsx`: se algum campo for objeto/array (após normalização), renderizar `JSON.stringify(...)` truncado em vez de deixar o React converter para `[object Object]`. Isso garante que nunca mais apareça aquele texto críptico — mostra o conteúdo real do bug ao usuário.
4. **Garantir que a versão atual do JSX já entregue na conversa anterior está mesmo aplicada** (labels com `(nomusu)`, `(nomcom)`, chips R910/R999/E099USU). A imagem do usuário mostra labels antigos — pode ser cache do preview, mas vou conferir o arquivo e re-aplicar se necessário.

## Detalhes técnicos

`normalizarUsuario` reescrito:

```ts
function normalizarUsuario(u: any): SguUsuario {
  if (!u || typeof u !== 'object') return u as SguUsuario;

  // Desembrulhar wrappers comuns: { usuario: {...} }, { dados: {...} }, { data: {...} }
  let base: any = u;
  for (const wrapper of ['usuario', 'dados', 'data']) {
    const inner = u[wrapper];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      base = { ...inner, ...u };  // top-level wins
      break;
    }
  }

  const codRaw = pickFirst(base, ['codusu', 'cod_usu', 'codigo', 'cod', 'id', 'usuario_codigo']);
  const codNum = Number(codRaw);
  // ... resto igual, usando `base` em vez de `u`
  return {
    ...base,
    codusu: Number.isFinite(codNum) ? codNum : (typeof codRaw === 'object' ? null : codRaw),
    // ...
  };
}
```

Helper de render seguro no JSX:

```tsx
const safeText = (v: any) =>
  v == null || v === '' ? '—'
  : typeof v === 'object' ? JSON.stringify(v).slice(0, 80)
  : String(v);
```

E aplicar nas linhas da grade de detalhes.

Em `getUsuario`, adicionar:

```ts
console.info('[SGU] payload bruto getUsuario', data, 'chaves:', Object.keys(data ?? {}));
```

## Arquivos afetados

- `src/lib/sguApi.ts` — `normalizarUsuario` (desembrulha wrappers) e `getUsuario` (log).
- `src/components/sgu/SguUsuariosTab.tsx` — helper `safeText` aplicado na grade de detalhes; reconfirmar labels novos e chips.

## Fora de escopo

- Não alterar a tabela principal nem o backend. Quando virmos no console qual era o formato real, podemos especializar mais a normalização.

## Objetivo

Refletir os novos campos do backend SGU (`situacao`, `status_usuario`, `ativo`, `sgu_habilitado`, `sgu_bloqueado`) na aba "Usuários" do módulo Gestão SGU, com badges semânticos, alerta de bloqueio e filtro por `status_usuario`.

## Mudanças

### 1. Tipo e normalização — `src/lib/sguApi.ts`

Adicionar campos na interface `SguUsuario`:

```ts
status_usuario?: 'ATIVO' | 'INATIVO' | 'SEM_PARAMETRIZACAO' | string | null;
situacao?: string | null;
ativo?: 0 | 1 | boolean | null;
sgu_habilitado?: 0 | 1 | boolean | null;
sgu_bloqueado?: 0 | 1 | boolean | null;
```

Em `normalizarUsuario`, mapear (com `pickFirst`) e **preservar** o valor cru — sem inferir status localmente. Apenas:
- Coagir `status_usuario` para upper-case quando string (`ATIVO`, `INATIVO`, `SEM_PARAMETRIZACAO`).
- Coagir flags binárias para 0/1 (mesma lógica já usada para `existe_r910`).

`getUsuarios(filtro, status?)` passa a aceitar segundo parâmetro opcional `status` que, quando diferente de `'TODOS'` e não vazio, é enviado como query param `?status=...` ao backend. O backend pode ignorar até implementar — o frontend filtra defensivamente em memória pelo campo `status_usuario` recebido como fallback.

### 2. UI — `src/components/sgu/SguUsuariosTab.tsx`

**Filtro Status** (Select shadcn) ao lado do input de busca:

- Opções: `TODOS` (default), `ATIVO`, `INATIVO`, `SEM_PARAMETRIZACAO`.
- Estado novo `statusFiltro`.
- `handlePesquisar` passa `statusFiltro` para `getUsuarios`.
- Mudar a opção dispara nova pesquisa automaticamente (se já existir resultado).

**Coluna "Status"** nova, antes da coluna R910:

| `status_usuario`         | Badge                          |
|--------------------------|--------------------------------|
| `ATIVO`                  | verde — `bg-emerald-500 text-white hover:bg-emerald-600` |
| `INATIVO`                | `variant="destructive"`        |
| `SEM_PARAMETRIZACAO`     | cinza — `variant="secondary"`  |
| outro/null               | `—` em `text-muted-foreground` |

Como o design system é HSL e não temos token verde semântico ainda, vou criar um **token novo** `--success` em `src/index.css` (light + dark) e estendê-lo em `tailwind.config.ts` (`success: { DEFAULT, foreground }`). Assim a badge verde fica consistente com tema. A badge usa `className="bg-success text-success-foreground hover:bg-success/90"`.

**Alerta de bloqueio**: dentro da célula Status, quando `sgu_bloqueado` for truthy (1/true), renderizar um ícone `Lock` em `text-destructive` ao lado da badge com `<Tooltip>` "Usuário SGU bloqueado".

**Painel de detalhes (Sheet)**: adicionar quatro linhas na grade — `Situação (situacao)`, `Status (status_usuario)`, `Ativo (ativo)`, `SGU habilitado (sgu_habilitado)` — usando `safeText` já existente. Acrescentar um chip extra `Bloqueado` (destructive) quando `sgu_bloqueado` truthy, ao lado dos chips R910/R999/E099USU.

### 3. Atualizar colSpan da row vazia

A linha "Pesquise para listar..." passa de `colSpan={10}` para `colSpan={11}` (adição da coluna Status).

## Detalhes técnicos

`tailwind.config.ts` — adicionar dentro de `theme.extend.colors`:

```ts
success: {
  DEFAULT: "hsl(var(--success))",
  foreground: "hsl(var(--success-foreground))",
},
```

`src/index.css`:

```css
:root {
  --success: 142 71% 38%;
  --success-foreground: 0 0% 100%;
}
.dark {
  --success: 142 71% 45%;
  --success-foreground: 0 0% 100%;
}
```

Helper de badge de status no componente:

```tsx
const StatusBadge = ({ status }: { status?: string | null }) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'ATIVO')
    return <Badge className="bg-success text-success-foreground hover:bg-success/90">Ativo</Badge>;
  if (s === 'INATIVO') return <Badge variant="destructive">Inativo</Badge>;
  if (s === 'SEM_PARAMETRIZACAO')
    return <Badge variant="secondary">Sem parametrização</Badge>;
  return <span className="text-muted-foreground">—</span>;
};
```

Filtro defensivo client-side (caso backend ainda não filtre):

```ts
const data = await getUsuarios(filtro, statusFiltro);
const filtrado = statusFiltro === 'TODOS'
  ? data
  : data.filter(u => (u.status_usuario ?? '').toUpperCase() === statusFiltro);
setUsuarios(filtrado);
```

## Arquivos afetados

- `src/lib/sguApi.ts` — interface + `normalizarUsuario` + assinatura de `getUsuarios`.
- `src/components/sgu/SguUsuariosTab.tsx` — filtro, coluna Status, badge, alerta bloqueado, painel detalhes.
- `src/index.css` — tokens `--success` / `--success-foreground` (light + dark).
- `tailwind.config.ts` — cor semântica `success`.

## Fora de escopo

- Não tocar no backend; apenas consumir os novos campos.
- Não recalcular `ativo`/`inativo` no frontend — só ler `status_usuario`.
- Não alterar comparação, preview, aplicar duplicação.

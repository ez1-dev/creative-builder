
# Extras para Usuários Conectados + alias de rota

A tela já existe (`/monitor-usuarios-senior` → `MonitorUsuariosSeniorPage`). Vamos só adicionar o que falta e expor a rota nova.

## 1. Alias de rota `/usuarios-conectados`

Em `src/App.tsx`, adicionar uma segunda `<Route>` apontando para o mesmo componente, reusando a permissão de `/monitor-usuarios-senior`:

```tsx
<Route path="/usuarios-conectados"
       element={<ProtectedRoute path="/monitor-usuarios-senior"><MonitorUsuariosSeniorPage /></ProtectedRoute>} />
```

A entrada do menu (`AppSidebar.tsx`) continua única em `/monitor-usuarios-senior` para não duplicar — o alias serve só para deep-links externos.

## 2. Voltar default do filtro Aplicativo para `SAPIENS`

Como pedido no requisito original. Continua sendo possível trocar para "Todos" no select.

## 3. Novo KPI: "Computadores distintos"

Substituir o KPI "Conectados >4h" por "Computadores Distintos" (contagem única de `computador`). O alerta de sessões longas continua funcionando via badge na coluna "Min." da tabela (vermelho > 4h, cinza > 2h), então não perdemos a sinalização — só tiramos o card.

```ts
const computadoresDistintos = new Set(filtered.map(s => s.computador).filter(Boolean)).size;
```

Ícone: `Monitor` do lucide-react.

## 4. Busca rápida na tabela

Novo `Input` com ícone de lupa, acima da tabela (à direita). Filtra `data` em todas as colunas-texto:

```ts
const [quickSearch, setQuickSearch] = useState('');
// dentro do filtered:
if (quickSearch) {
  const q = quickSearch.toLowerCase();
  const haystack = [
    s.numsec, s.usuario_senior, s.usuario_windows, s.computador, s.aplicativo,
    s.cod_modulo, s.modulo, s.instancia, s.tipo_aplicacao, s.mensagem_admin,
  ].map(v => String(v ?? '').toLowerCase()).join(' ');
  if (!haystack.includes(q)) return false;
}
```

## 5. Ordenação por coluna (clicar no header)

Suporte a 3 colunas-chave: **Sessão**, **Usuário Senior**, **Módulo** (conforme pedido). Adiciono ícone clicável (`ArrowUp` / `ArrowDown` / `ArrowUpDown` neutro) ao lado do título.

```ts
type SortKey = 'numsec' | 'usuario_senior' | 'modulo';
const [sortKey, setSortKey] = useState<SortKey | null>(null);
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
const toggleSort = (k: SortKey) => {
  if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  else { setSortKey(k); setSortDir('asc'); }
};
// aplicado depois do filtered, antes de exibir:
const sorted = useMemo(() => {
  if (!sortKey) return filtered;
  const sign = sortDir === 'asc' ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? '';
    if (sortKey === 'numsec') return (Number(av) - Number(bv)) * sign;
    return String(av).localeCompare(String(bv), 'pt-BR') * sign;
  });
}, [filtered, sortKey, sortDir]);
```

A tabela passa a iterar `sorted` em vez de `filtered`.

## 6. Exportação CSV

Botão "Exportar CSV" no header, ao lado de "Atualizar". Gera um Blob CSV (UTF-8 com BOM, separador `;`) e dispara download:

```ts
const exportCsv = () => {
  const headers = ['Sessão','Usuário Senior','Usuário Windows','Computador','Aplicativo',
    'Cód. Módulo','Módulo','Conexão','Min.','Instância','Tipo Aplic.','Mensagem Admin'];
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = sorted.map(s => [
    s.numsec, s.usuario_senior, s.usuario_windows, s.computador, s.aplicativo,
    s.cod_modulo, s.modulo, s.data_hora_conexao, s.minutos_conectado,
    s.instancia, s.tipo_aplicacao, s.mensagem_admin
  ].map(escape).join(';'));
  const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `usuarios-conectados-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  a.click();
};
```

## 7. Botão "Consultar"

Já existe via "Atualizar". O pedido fala em "Consultar" e "Atualizar" como dois botões — semanticamente fazem a mesma coisa (recarregar do backend). Vou manter apenas "Atualizar" para não poluir o header. Se você quiser dois botões idênticos, é só dizer.

## Arquivos alterados

- `src/App.tsx` — adicionar rota alias.
- `src/pages/MonitorUsuariosSeniorPage.tsx` — busca rápida, ordenação, novo KPI, export CSV, voltar default Aplicativo para `SAPIENS`.

Sem alterações em backend, banco ou outras telas.

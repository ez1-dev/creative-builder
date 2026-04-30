## Objetivo

Fazer `/passagens-aereas` recarregar automaticamente os dados (incluindo `uf_destino` para o mapa) sem precisar de Ctrl+Shift+R.

Hoje a página só busca dados uma vez no mount (`useEffect(() => { load() }, [])`). Quando o banco é atualizado por backfill, importação em outra aba, ou por outro usuário, o mapa fica desatualizado até o reload manual.

## Mudanças

### 1. Realtime — recarrega ao detectar mudanças no banco
Subscribe Postgres changes da tabela `passagens_aereas` (já usado em outros módulos do projeto). Qualquer INSERT/UPDATE/DELETE dispara `load()`.

Requer migration para adicionar a tabela à publicação `supabase_realtime`:
```sql
ALTER TABLE public.passagens_aereas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.passagens_aereas;
```

### 2. Reload ao voltar à aba
Listeners `visibilitychange` + `focus` chamam `load()` quando o usuário retorna à página. Cobre o caso de migrações/backfills feitos enquanto a aba estava em segundo plano (não depende de realtime estar habilitado).

### 3. Botão "Atualizar" no header
Botão visível com ícone `RefreshCw` (anima ao carregar) ao lado de "Compartilhar / Importar / Novo registro". Permite forçar reload manual sem F5.

## Arquivos

- **edita** `src/pages/PassagensAereasPage.tsx`:
  - Importa `RefreshCw` do `lucide-react`.
  - Adiciona `useEffect` com listeners `visibilitychange` e `focus`.
  - Adiciona `useEffect` com canal Supabase Realtime escutando `postgres_changes` em `passagens_aereas`.
  - Adiciona botão "Atualizar" em `PageHeader.actions` (sempre visível, mesmo para usuários read-only).

- **migration nova** (será aplicada via tool de migration ao sair do modo plan): habilita realtime na tabela.

## Detalhe técnico — bloco realtime

```ts
useEffect(() => {
  const channel = supabase
    .channel('passagens_aereas_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'passagens_aereas' },
      () => { load(); },
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

A página `/passagens-aereas-compartilhado` (link público) **não** ganha realtime nesta rodada — usa RPC com token e a sessão é anônima; mantém comportamento atual.

Aprove para implementar.
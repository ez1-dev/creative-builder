

## Corrigir reset de aba ao alternar permissões por tela

### Diagnóstico
Ao clicar em "Visualizar" / "Editar" na aba **Permissões por Tela**, a função `toggleScreen` (linha 341 de `src/pages/ConfiguracoesPage.tsx`) chama `fetchData()` ao terminar. Esse `fetchData` faz `setLoading(true)` e recarrega 5 tabelas em paralelo. Enquanto `loading` é `true`, o componente retorna um placeholder de "Carregando..." (linha 389–396) **fora** do `<Tabs>`. Isso desmonta as Tabs, e quando elas remontam o `defaultValue` volta para a primeira aba ("Perfis de Acesso") — daí a sensação de "saiu da tela".

Além disso, o `<Tabs>` é não-controlado (usa `defaultValue`), então qualquer remontagem perde o estado da aba ativa.

### Mudança (arquivo único: `src/pages/ConfiguracoesPage.tsx`)

**1. Atualização local + refresh em background no `toggleScreen`**
Em vez de chamar `fetchData()` (que dispara o spinner global), atualizar o array `profileScreens` localmente após o `update`/`insert` no Supabase. O Supabase já valida a escrita; basta refletir no estado.

```ts
// após o update:
setProfileScreens(prev => prev.map(ps => 
  ps.id === existing.id ? { ...ps, ...updates } : ps
));

// após o insert (usar .select().single() para pegar o id gerado):
const { data: inserted } = await supabase.from('profile_screens').insert({...}).select().single();
if (inserted) setProfileScreens(prev => [...prev, inserted]);
```

Sem `setLoading(true)`, sem desmontar as Tabs.

**2. Tornar `<Tabs>` controlado**
Adicionar `const [activeTab, setActiveTab] = useState('perfis')` e usar `<Tabs value={activeTab} onValueChange={setActiveTab}>` em vez de `defaultValue`. Garantia extra: mesmo que algum re-render aconteça, a aba ativa é preservada.

**3. Não bloquear a tela com "Carregando..." em refreshes subsequentes**
Trocar a condição do early-return para algo como:
```ts
if (loading && profiles.length === 0) { ... }  // só mostra carregando no 1º load
```
Assim, refreshes futuros (caso necessários em outras ações) não desmontam mais a UI.

**4. Toast de feedback**
Adicionar `toast.success('Permissão atualizada')` (ou silencioso) no `toggleScreen` para o usuário confirmar a ação sem precisar olhar as Tabs.

### Efeito colateral em outras ações
Aprovar usuário, salvar perfil, etc., continuam chamando `fetchData()`. Como o item 3 evita o spinner em refreshes subsequentes, essas ações também passam a preservar a aba ativa — comportamento desejado.

### Detalhes técnicos
- Sem mudança de schema, RLS ou backend.
- Sem mudança em outras telas.
- O bug do warning "Function components cannot be given refs" no `Badge` é independente e não afeta esse comportamento (fica fora de escopo).

### Fora de escopo
- Refatorar o estado de `loading` granular por seção.
- Corrigir o warning do `Badge` (forwardRef).
- Persistir aba ativa entre navegações.

### Resultado
Marcar/desmarcar "Visualizar" ou "Editar" em Permissões por Tela atualiza a célula instantaneamente, sem piscar "Carregando...", sem voltar para a aba de Perfis de Acesso, e sem perder a posição de scroll.


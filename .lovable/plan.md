

## Corrigir botão "Atualizar agora" oculto no modal de update

### Diagnóstico
O `DialogContent` usa `className="sm:max-w-md [&>button]:hidden"`. O seletor `[&>button]:hidden` foi pensado para ocultar o botão "X" de fechar (filho direto do `DialogContent`), mas como o botão **"Atualizar agora"** também é filho `<button>` direto do mesmo container, ele acaba sendo escondido junto. Resultado: o modal abre (a versão `1.0.1` no banco difere da `1.0.0` carregada), mas o usuário não vê o botão de ação.

### Correção (1 arquivo, 2 linhas)

Em `src/components/UpdateNotifier.tsx`:

1. **Trocar o seletor que esconde o "X"**: usar `[&>button.absolute]:hidden` (o botão de fechar do shadcn tem `className` começando com `absolute right-4 top-4`), ou envolver o `<Button>` "Atualizar agora" em uma `<div>` para que ele não seja mais filho direto.

Solução escolhida — **envolver em `<div>`** (mais robusta, não depende de classes internas do shadcn):

```tsx
<div>
  <Button onClick={handleRefresh} disabled={refreshing} className="w-full gap-2">
    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
    {refreshing ? 'Atualizando...' : 'Atualizar agora'}
  </Button>
</div>
```

Assim o `[&>button]:hidden` continua escondendo só o "X" do shadcn (que permanece filho direto), e o nosso botão volta a aparecer.

### Resultado
Modal de "Nova versão disponível" passa a exibir corretamente o botão **"Atualizar agora"**, permitindo ao usuário recarregar e aplicar a atualização.


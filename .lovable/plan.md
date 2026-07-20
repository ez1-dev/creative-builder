## Plano para corrigir o erro em Personalizar Menus

### Problema confirmado
A tela quebra dentro de `useMenuLayout.tsx` ao montar o canal realtime `menu-layout-sync`.

O código cria o canal, adiciona o callback de `menu_layout_global`, e em seguida, quando existe `userId`, tenta adicionar outro callback ao mesmo canal. Em algumas execuções o client realtime considera o canal já inscrito/assinado e lança:

```text
cannot add `postgres_changes` callbacks for realtime:menu-layout-sync after `subscribe()`
```

### Correção proposta
1. **Reescrever a criação do canal realtime de forma atômica**
   - Montar a cadeia completa de `.on('postgres_changes', ...)` antes de chamar `.subscribe()`.
   - Nunca adicionar callbacks depois do `.subscribe()`.

2. **Evitar colisão entre instâncias do canal**
   - Usar um nome de canal estável porém específico por usuário, por exemplo `menu-layout-sync:<userId ou anon>`.
   - Isso evita reaproveitamento acidental de um canal anterior ainda em cleanup.

3. **Manter cleanup correto**
   - Continuar removendo o canal no `return` do `useEffect` com `supabase.removeChannel(channel)`.
   - Não criar subscriptions em escopo de componente fora de `useEffect`.

4. **Proteger a tela contra falhas de subscription**
   - Envolver a inscrição realtime para não derrubar a renderização caso o realtime falhe.
   - A tela continuará funcionando com os fallbacks já existentes: refetch ao foco e polling a cada 5 minutos.

5. **Validar**
   - Abrir `/personalizar-menus` no preview.
   - Confirmar que a tela renderiza sem o erro.
   - Confirmar que os menus continuam carregando mesmo se realtime não conectar.

### Arquivo afetado
- `src/hooks/useMenuLayout.tsx`

Sem mudança de schema nem alteração nas permissões do backend.
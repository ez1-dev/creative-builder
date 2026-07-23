## Problema

Em **Configurações → Liberações → Permissões por Tela**, o catálogo de telas (definido em `src/pages/ConfiguracoesPage.tsx`, por volta da linha 53–60) não inclui **Aging (Receber/Pagar)** nem **Kardex de Estoque**, apesar de as rotas existirem em `App.tsx` e no menu (`menuCatalog.ts`). Sem essas entradas, os perfis não conseguem receber liberação/negação dessas telas na UI e elas também não aparecem no `screenCatalog` de telemetria.

## Alteração

Adicionar duas linhas ao array de telas em `src/pages/ConfiguracoesPage.tsx`, no bloco Financeiro/Contábil, logo após `/contabilidade/fluxo-caixa`:

```
{ path: '/contabilidade/aging',  name: 'Contabilidade — Aging (Receber/Pagar)' },
{ path: '/contabilidade/kardex', name: 'Contabilidade — Kardex de Estoque' },
```

Complementarmente, adicionar as mesmas rotas em `src/lib/screenCatalog.ts` (mapa `EXACT`) para que o log de navegação registre `tela_codigo`/`tela_nome` corretos:

```
'/contabilidade/aging':  { codigo: 'CONT_AGING',  nome: 'Contabilidade — Aging (Receber/Pagar)' },
'/contabilidade/kardex': { codigo: 'CONT_KARDEX', nome: 'Contabilidade — Kardex de Estoque' },
```

Nenhum outro comportamento muda: como o agrupador `getModule` já trata qualquer `/contabilidade/*` como módulo **Financeiro / Contábil**, as duas telas aparecerão automaticamente nesse grupo, prontas para ligar/desligar `can_view`/`can_edit`/`can_delete` por perfil e para exceções por usuário.

Não são criadas linhas em `profile_screens` — perfis sem registro continuam sem acesso (comportamento atual), e o admin libera na tela.
## Causa

A rota `/rh/absenteismo` existe em `src/App.tsx` e o card foi adicionado em `RhIndexPage`, porém a página está protegida por `ProtectedRoute` que consulta `src/lib/screenCatalog.ts`. Como a entrada `/rh/absenteismo` não foi cadastrada no catálogo, o guard bloqueia o acesso (mesmo para admin em alguns fluxos de permissão) e a página não aparece.

## Correção

Adicionar em `src/lib/screenCatalog.ts`, junto às demais telas de RH:

```
'/rh/absenteismo': { codigo: 'RH_ABSENTEISMO', nome: 'RH — Absenteísmo / Afastamentos' },
```

Nenhuma outra alteração é necessária — rota, página, API, modal, exportação Excel e painel de IA já estão implementados.

## Validação

- Acessar `/rh/absenteismo` e conferir carregamento do dashboard.
- Conferir que o card "06 — Absenteísmo / Afastamentos" em `/rh` navega corretamente.

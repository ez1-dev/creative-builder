## Problema

Em "Editar layout" das páginas RH, aumentar/diminuir a altura (e largura) dos cards não fica salvo — ao recarregar, o layout volta ao original.

## Causa

Os widgets default (ex.: `RESUMO_FOLHA_DEFAULTS`, `QUADRO_DEFAULTS`, etc.) têm `id` sintético em string (ex.: `'kpis-resumo'`, `'kpi-qtde'`). Quando o usuário ainda não tem linhas gravadas em `dashboard_widgets`, o estado inicial usa esses ids.

Em `useRhModuleLayout.ts` → `runSave`, a decisão entre UPDATE e INSERT é:

```ts
if (cur?.id && !String(cur.id).startsWith('tmp-')) {
  // UPDATE .eq('id', cur.id)
} else {
  // INSERT
}
```

Como `'kpis-resumo'` não começa com `tmp-`, o código tenta um UPDATE em `dashboard_widgets` com `id = 'kpis-resumo'`. A coluna é `uuid`, então PostgREST responde erro "invalid input syntax for type uuid". O `runSave` cai no `anyError` → dispara `load({ silent: true })` que recarrega os widgets do banco (vazio) e volta aos defaults — visualmente parece que "não salvou".

Isso afeta todas as páginas RH na primeira edição, e continua afetando widgets que ainda não foram persistidos após saves parciais.

## Correção

Trocar o critério de "existe no banco" por uma detecção real de UUID em `useRhModuleLayout.ts`:

1. Adicionar helper local `isUuid(id)` (regex padrão v4/geral).
2. Em `runSave`, usar `if (cur?.id && isUuid(cur.id))` para decidir UPDATE; caso contrário, cai no INSERT (o caminho que já resolve `block_id` e insere corretamente).
3. Após o INSERT, o `setWidgets` já atualiza os ids reais retornados por `insert().select('id, type')`, então saves subsequentes passam a fazer UPDATE normalmente.

Nenhuma outra mudança é necessária:
- `saveGeometries`, `handleStop`/`stepResize` e o debounce continuam iguais.
- Defaults permanecem com seus ids atuais; a rota de save é que passa a tratá-los corretamente.

## Arquivos alterados

- `src/hooks/useRhModuleLayout.ts` — adicionar `isUuid` e ajustar a condição no `runSave`.

## Validação

- Abrir `/rh/resumo-folha`, entrar em "Editar layout", aumentar a altura de um card com o botão `+`, sair do modo edição e recarregar a página — a nova altura permanece.
- Repetir em outra página RH (ex.: `/rh/quadro-colaboradores`) que também parte de defaults.
- Conferir no console/network que o UPDATE (para widgets já persistidos) e o INSERT (para os que ainda não existiam) ocorrem sem erro `invalid input syntax for type uuid`.

## Objetivo

Adicionar três filtros independentes na aba **Auditoria Revenda** (Faturamento Genius) para listar registros sem revenda em cada um dos três níveis: NF, Pedido, Item do Pedido.

## Arquivo alterado

`src/components/faturamento/AuditoriaRevendaTab.tsx` (único). Sem alterações de endpoint.

## Mudanças

### 1. Interface `Filters` e `initialFilters`

Adicionar três flags booleanas (default `false`):

```ts
sem_revenda_nf: boolean;
sem_revenda_pedido: boolean;
sem_revenda_item_pedido: boolean;
```

### 2. `buildParams`

Quando a flag estiver marcada, enviar `true`; caso contrário, omitir (`undefined`):

```ts
sem_revenda_nf: f.sem_revenda_nf || undefined,
sem_revenda_pedido: f.sem_revenda_pedido || undefined,
sem_revenda_item_pedido: f.sem_revenda_item_pedido || undefined,
```

Endpoint `GET /api/faturamento-genius/auditoria-revenda` continua o mesmo — apenas três query params novos.

### 3. UI dos filtros

Após a grid de inputs (Ano/Mês, Projeto, Origem, etc.), adicionar uma linha de checkboxes independentes:

```
[ ] Sem revenda na NF
[ ] Sem revenda no Pedido
[ ] Sem revenda no Item do Pedido
```

Layout: `<div className="flex flex-wrap gap-4 pt-2">` com três `<label>` + `<Checkbox>` (mesmo padrão visual usado no modal Aplicar Revenda).

Os três filtros são independentes — podem ser combinados (ex.: marcar NF + Item retorna registros sem revenda em qualquer um dos dois, conforme tratamento do backend).

### 4. Comportamento

- Ao alterar qualquer checkbox, apenas atualiza o estado (sem auto-buscar).
- Usuário clica **Buscar Auditoria** para aplicar.
- O botão **Exportar Excel** (que já usa `buildParams`) leva os filtros automaticamente.

## Fora de escopo

Tabela, colunas, modal Aplicar Revenda, KPIs, demais filtros — inalterados.

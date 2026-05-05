## Objetivo

Refinar os três filtros de ausência de revenda já existentes na aba **Auditoria Revenda** (Faturamento Genius) para: (1) virem marcados por padrão, (2) serem enviados sempre como `true`/`false` (não omitidos), (3) bloquearem busca quando todos desmarcados, (4) ficarem visualmente agrupados sob o título "Auditar ausência de revenda em:".

## Arquivo alterado

`src/components/faturamento/AuditoriaRevendaTab.tsx` (único). Sem mudanças de endpoint, Supabase ou mocks.

## Mudanças

### 1. `initialFilters` (linha ~108)
Trocar default das três flags para `true`:

```ts
sem_revenda_nf: true,
sem_revenda_pedido: true,
sem_revenda_item_pedido: true,
```

### 2. `buildParams` (linha ~135)
Enviar sempre o boolean como string, não omitir:

```ts
sem_revenda_nf: String(f.sem_revenda_nf),
sem_revenda_pedido: String(f.sem_revenda_pedido),
sem_revenda_item_pedido: String(f.sem_revenda_item_pedido),
```

### 3. `validar()` (linha ~291)
Acrescentar validação:

```ts
if (!f.sem_revenda_nf && !f.sem_revenda_pedido && !f.sem_revenda_item_pedido)
  return 'Selecione ao menos um tipo de ausência de revenda para auditar.';
```

### 4. UI dos filtros (linha ~500)
Envolver os três checkboxes num bloco com título:

```
Auditar ausência de revenda em:
[x] NF   [x] Pedido   [x] Item do Pedido
```

Trocar labels atuais ("Sem revenda na NF" etc.) por curtos: **"NF"**, **"Pedido"**, **"Item do Pedido"**, com o título acima como `<div className="text-xs font-medium text-muted-foreground">`.

## Itens já implementados (sem mudança)

Conforme verificado no arquivo, já estão prontos:
- Colunas **Revenda NF / Revenda Pedido / Revenda Item Pedido / Status / Motivo** com badges (cinza para "Sem revenda", verde/amarelo/vermelho conforme status).
- Modal **Aplicar Revenda** com autocomplete em `/api/faturamento-genius/revendas?q=` enviando `codcli_revenda: Number(...)`.
- Endpoint `GET /api/faturamento-genius/auditoria-revenda` consumido via `api.get` (FastAPI, sem Supabase/mock).

## Fora de escopo

Tabela, modal Aplicar Revenda, KPIs, demais filtros, export Excel (já recebe os params via `buildParams`).

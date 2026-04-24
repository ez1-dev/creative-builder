## Filtro "somente GENIUS" no /api/faturamento-genius-dashboard

O backend FastAPI hoje retorna **todas as revendas** quando o filtro `revenda` está vazio. Isso faz os totais da tela divergirem dos números oficiais Genius (Jan–Abr/2026), porque entram revendas que não fazem parte da visão Genius. Solução: criar uma whitelist de revendas Genius no backend e expor um parâmetro `somente_genius=true` que aplica essa whitelist via SQL.

### 1. Backend (FastAPI)

**Constante (no mesmo módulo das demais constantes Genius já adicionadas):**

```python
# Códigos de revenda que compõem a visão oficial "Faturamento Genius"
GENIUS_REVENDAS = ('GENIUS',)  # ajustar caso existam outras revendas oficiais
GENIUS_REVENDAS_SQL = ", ".join(f"'{x}'" for x in GENIUS_REVENDAS)
```

**Assinatura dos endpoints** (`/api/faturamento-genius-dashboard`, `/api/faturamento-genius`, `/api/export/faturamento-genius`):

```python
somente_genius: bool = Query(False)
```

**Em `_where_faturamento_genius()`** acrescentar:

```python
if somente_genius:
    where.append(f"UPPER(LTRIM(RTRIM(COALESCE(REV.NOMREV,'')))) IN ({GENIUS_REVENDAS_SQL})")
```

(usar o campo/JOIN que já identifica a revenda no SELECT atual — provavelmente `REV.NOMREV` ou alias equivalente; manter o mesmo predicado em todos os 3 endpoints para garantir consistência entre KPI dashboard, detalhe paginado e export Excel).

**Compatibilidade:** valor default `False` preserva o comportamento atual de quem não passar o parâmetro.

### 2. Frontend (`src/pages/FaturamentoGeniusPage.tsx`)

- Adicionar campo `somente_genius: boolean` em `Filters` (default `true`, já que esta tela é a "visão Genius").
- Adicionar Switch no `FilterPanel`: **"Somente revendas Genius"** (ligado por padrão).
- Em `buildParams`, enviar `somente_genius: f.somente_genius` quando `true`.
- Quando o usuário digitar uma `revenda` específica no filtro de texto, manter ambos os parâmetros (backend faz AND).
- No painel de validação Genius (`ValidacaoGeniusPanel`), quando `somente_genius=true` o aviso de "filtre revenda = GENIUS" deixa de aparecer.

### 3. Validação

Após deploy do backend:
1. Abrir `/faturamento-genius` com `Mês = 03/2026`, Switch "Somente Genius" ligado.
2. Conferir contra os targets oficiais:
   - Fat. R$ 191.603 / Dev. R$ 821 / Impostos -R$ 27.370 / Fat. Líq. R$ 161.674 / Qtd 2.768 / 25 vendas / 14 clientes.
3. Repetir para Jan/Fev/Abr usando o painel "Modo validação Genius" — todos os deltas devem ficar verdes.

### Arquivos afetados

- Backend FastAPI: módulo do Faturamento Genius (constante + 3 endpoints + função `_where_faturamento_genius`).
- `src/pages/FaturamentoGeniusPage.tsx`: novo campo no estado, Switch no FilterPanel, `buildParams`, ajuste do painel de validação.

### Garantias

- Parâmetro opcional com default `False` no backend → não quebra outros consumidores.
- Frontend continua permitindo digitar uma revenda específica (filtros combinam via AND).
- Nenhuma mudança em colunas, tipos de retorno ou contrato JSON.

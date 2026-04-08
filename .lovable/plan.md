

# Corrigir botão "Limpar" nas 5 páginas restantes

## Problema
O botão "Limpar" nas páginas abaixo só reseta os filtros, mas não limpa `data` nem `pagina`, deixando tabela/KPIs visíveis após limpar.

Páginas já corrigidas: OndeUsa, ComprasProduto, Estoque, BOM.

## Páginas a corrigir

### 1. `src/pages/PainelComprasPage.tsx`
Alterar `clearFilters` para também chamar `setData(null)` e `setPagina(1)`.

### 2. `src/pages/EngenhariaProducaoPage.tsx`
Alterar `clearFilters` para também chamar `setData(null)` e `setPagina(1)`.

### 3. `src/pages/ConciliacaoEdocsPage.tsx`
Alterar `clearFilters` para também chamar `setData(null)` e `setPagina(1)`.

### 4. `src/pages/AuditoriaTributariaPage.tsx`
Alterar `clearFilters` para também chamar `setData(null)` e `setPagina(1)`.

### 5. `src/pages/NotasRecebimentoPage.tsx`
Alterar `clearFilters` para também chamar `setData(null)` e `setPagina(1)`.

## Padrão da correção
Em cada `clearFilters`, adicionar ao final:
```ts
setData(null);
setPagina(1);
```


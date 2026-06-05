## Novo grupo "BI" na sidebar

Criar grupo colapsável `BI` em `src/components/AppSidebar.tsx`, no mesmo padrão dos grupos `Produção`, `Cadastros`, `Regras Senior` e `Relatórios`.

### Itens movidos para o grupo BI
Remover do array `modules` (lista raiz) e mover para `biSubItems`:

- Validação BI Faturamento → `/bi/faturamento-validacao` (FileCheck)
- BI Comercial → `/bi/comercial` (BarChart3)
- Metas de Faturamento → `/bi/comercial/metas` (BarChart3)
- Biblioteca BI → `/biblioteca-bi` (Palette)
- Central ETL → `/etl` (Database)

Observação: itens como "Painel de Compras", "Faturamento Genius", "Carga — Dashboard BI" continuam onde estão (são módulos operacionais de cada área, não a área de BI corporativo). Caso queira mover algum desses também, ajustar antes de implementar.

### Implementação

1. Em `AppSidebar.tsx`:
   - Criar `biSubItems` com os 5 itens acima.
   - Adicionar `isBiActive = location.pathname.startsWith('/bi') || pathname === '/biblioteca-bi' || pathname.startsWith('/etl')`.
   - Filtrar via `isVisible` (mesma lógica de permissões; `/biblioteca-bi` permanece em `ALWAYS_VISIBLE`).
   - Renderizar `<SidebarGroup>` com `<Collapsible defaultOpen={isBiActive}>`, ícone `BarChart3` no header, label "BI".
   - Mostrar grupo só se `visibleBi.length > 0`.
2. Remover os 5 itens correspondentes do array `modules`.
3. Sem mudanças em rotas, permissões, `screenCatalog.ts` ou backend.

### Diagrama final da sidebar

```text
Módulos (operacionais)
Cadastros        ▾
Produção         ▾
BI               ▾   ← novo
Regras Senior    ▾
Relatórios       ▾
```

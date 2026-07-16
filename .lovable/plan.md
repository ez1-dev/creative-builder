## Modernizar gráfico "Tipos de Evento" (Resumo da Folha)

Substituir o donut atual (Recharts direto, legenda embaixo) pelo mesmo componente já usado no dashboard de Manutenção de Frota, e colocá-lo em linha própria.

**Arquivo 1 — `src/pages/rh/ResumoFolhaPage.tsx`**
- Importar `DonutSideLegendCard` de `@/components/bi/charts/DonutSideLegendCard`.
- Substituir o bloco `"tipos-evento"` (linhas 593–615) por:
  ```tsx
  "tipos-evento": (
    <DonutSideLegendCard
      title="Tipos de Evento"
      subtitle="% e valor por tipo de evento"
      data={tiposPie.map(t => ({ label: String(t.label ?? "—"), valor: Number(t.valor) || 0 }))}
      loading={isLoading}
      height={380}
    />
  ),
  ```
- Remover imports não usados (`PieChart`, `Pie`, `Cell`, `Legend`, `PIE_COLORS`) se ficarem órfãos após a troca — validar com grep antes de deletar.

**Arquivo 2 — `src/lib/rh/widgetCatalogs.ts`**
- Ajustar o default do bloco para ocupar linha inteira:
  - `filial`: `w: 12` (linha 34)
  - `tipos-evento`: `x: 0, y: 44, w: 12, h: 10` (linha 35)

Isso deixa "Tipos de Evento" sozinho abaixo de "Custo por Filial", com o mesmo layout donut + legenda lateral rica (nome, valor, %) da tela de Manutenção de Frota, cores oficiais da BI_PALETTE, total centralizado e hover cruzado.

Nenhuma mudança de dados, backend ou fórmula. Usuários que já customizaram o layout mantêm o layout salvo (o default só aplica para quem não editou).
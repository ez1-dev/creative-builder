## Diagnóstico

O dropdown "Série / dados" na captura mostra apenas "Evolução Mensal (R$)" — esse era o rótulo **antigo** da série legada. Depois da última build esse mesmo item foi renomeado para "Evolução Mensal (R$) — legado" e foram adicionadas ~56 novas combinações (Dimensão × Métrica + Mensal × Métrica) no `pageRegistry.ts` (função `buildFrotaSeriesOptions()`).

Confirmado no código:
- `src/lib/bi/pageRegistry.ts` linha 341: `series: buildFrotaSeriesOptions()` injeta as ~63 entradas no schema da página `frota`.
- `src/components/passagens/AddChartDialog.tsx` linha 46: lê `page?.schema.series ?? []` e renderiza todas em `<SelectItem>`.
- `FrotaDashboard.tsx` passa `pageKey="frota"` para o `AddChartDialog`.

Como o rótulo na tela ainda é o antigo, o que está acontecendo é que o preview do navegador está com **bundle/cache anterior à mudança** — não foi um bug funcional, foi um asset não recarregado.

## Plano

1. **Garantir que o reload mostre a lista nova** — sem alterações de código, apenas validar:
   - Abrir `/manutencao-frota`.
   - Clicar em **Editar layout → Novo gráfico**.
   - Abrir o dropdown "Série / dados" e conferir que aparecem entradas como:
     - "Evolução mensal · Valor (R$)", "Evolução mensal · Quantidade", …
     - "Placa · Valor (R$)", "Placa · % do total (valor)", "Placa · Quantidade", "Placa · KM (soma)", …
     - O mesmo para Fornecedor, Descrição, Motorista, Centro de Custo, Segmento, Tipo de Veículo
     - Itens marcados com "— legado" (compatibilidade com layouts antigos).

2. **Melhorar a UX do dropdown para facilitar achar a opção** (mudança pequena, segura, só no `AddChartDialog` e `ConfigureChartDialog`):
   - Agrupar visualmente os itens por seção dentro do `SelectContent`:
     - **Evolução mensal** (`mensal__*`)
     - **Por dimensão** (`por_*__*`)
     - **Legado** (chaves sem `__`)
   - Usar `SelectGroup` + `SelectLabel` do shadcn. Cabeçalhos não selecionáveis, só rótulo, para que a lista fique navegável mesmo com ~60 itens.
   - Nenhuma mudança de chaves, payloads, layout salvo nem cross-filter.

3. **Não alterar nada do backend, Cloud, layouts salvos ou pageRegistry**. A função `buildFrotaSeriesOptions()` permanece como está.

## Critério de aceite

- Após reload, o dropdown "Série / dados" no diálogo "Adicionar novo gráfico" do dashboard Manutenção de Frota lista todas as combinações Dimensão × Métrica + Evolução mensal × Métrica.
- O dropdown fica organizado em três grupos: **Evolução mensal**, **Por dimensão**, **Legado**.
- Widgets antigos continuam funcionando (chaves legadas preservadas).

## Fora de escopo

- Mudanças no dashboard de Manutenção de Máquinas.
- Backend/ETL/Cloud — nada toca.

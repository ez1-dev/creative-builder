## Diagnóstico atual

O módulo `Passagens Aéreas` **já tem uma base responsiva** (usa `grid-cols-1 md:grid-cols-X`, `flex-wrap`, `overflow-x-auto`), mas tem **vários pontos que pioram a experiência no celular** (viewport ~375–414px).

### Problemas encontrados

1. **Header da página** (`PassagensAereasPage.tsx`) — botões "Compartilhar", "Importar planilha" e "Novo registro" ficam na mesma linha do `PageHeader` e podem estourar em telas estreitas / esconder rótulos.
2. **Filtros do topo** (`PassagensDashboard.tsx`, ~l. 342–425) — grid 6 colunas no desktop, mas em mobile cada filtro vira uma linha (ok); o problema é o **botão "Limpar"** que fica isolado à direita e o card ocupa muito espaço vertical.
3. **KPI "Registros"** (l. 472–505) — tem um Select "Agrupar por" + ícone **posicionados em `absolute right-2 top-2`**, sobrepondo o texto do KPI em telas pequenas (largura do card ≈ 340px, Select = 140px). É o pior bug visual hoje.
4. **Gráficos** (l. 510–597):
   - PieChart "Por Motivo de Viagem" com `outerRadius={100}` + labels longos (`"Folha de Campo R$120 Mil (45,00%)"`) é cortado no mobile.
   - BarChart "Top 15 CC" com `YAxis width={140}` deixa pouquíssimo espaço para as barras em 375px.
4. **Toolbar do card "Registros"** (l. 600–646) — Search (200px) + Select ordenação (180px) + botão "Agrupar Colaborador" + 2 botões de exportar = quebra em várias linhas, mas Search e Select têm largura fixa que pode estourar.
5. **Tabela de registros** (l. 647–728) — 8 colunas; já tem `overflow-x-auto`, mas no mobile vira uma rolagem horizontal longa. Não há visão "card" alternativa.
6. **Banner de cross-filter** (l. 440–468) — ok, já usa `flex-wrap`.
7. **Dialog "Novo/Editar registro"** (`PassagensAereasPage.tsx`, l. ~145) — `max-w-3xl max-h-[90vh] overflow-y-auto` + grid 3 colunas; em mobile vira 1 coluna, mas o `DialogContent` padrão do shadcn já tem boa adaptação.
8. **Sheet "Registros agrupados"** (l. 730–) — `w-full sm:max-w-xl` ok no mobile.
9. **Página compartilhada** (`PassagensAereasCompartilhadoPage.tsx`) — herda os mesmos problemas do dashboard.

## Resposta direta

**Parcialmente.** O módulo funciona em mobile (não quebra), mas tem problemas de usabilidade:
- KPI "Registros" tem o controle de agrupamento sobreposto ao conteúdo (pior caso).
- Gráficos ficam apertados em telas estreitas.
- Tabela com 8 colunas exige muita rolagem horizontal.
- Botões do header podem estourar.

## Plano de melhorias

### 1. `PassagensAereasPage.tsx` — Header
- Ajustar `PageHeader`/área de ações para empilhar verticalmente em mobile (`flex-col sm:flex-row`) e os botões usarem largura total quando pequenos.
- Em mobile, mostrar somente o ícone + texto curto ou usar `flex-wrap` com botões `size="sm"` consistentes.

### 2. `PassagensDashboard.tsx` — KPI "Registros" (problema principal)
- Remover o posicionamento `absolute` do Select de agrupamento.
- Em mobile: mover o Select "Agrupar por" + botão de detalhes para **abaixo** do KPI (renderizar como um pequeno toolbar dentro do card, ocupando largura total).
- Em desktop (≥md), manter o comportamento atual ou usá-lo dentro do card sem sobrepor.

### 3. Gráficos
- **PieChart**: em mobile detectar com `useIsMobile()` e:
  - reduzir `outerRadius` para ~70;
  - desabilitar `label` (ou usar label curto só com `%`) e mostrar a legenda abaixo;
  - aumentar altura para 360.
- **BarChart Top 15 CC**: em mobile reduzir `YAxis width` para 90 e truncar labels com `tickFormatter`; reduzir para Top 10.
- **Evolução Mensal**: ok, só garantir `ResponsiveContainer`.

### 4. Toolbar do card "Registros"
- Em mobile: Search ocupa largura total (`w-full sm:w-[200px]`); ordenação `w-full sm:w-[180px]`; botões Exportar/Agrupar com `flex-1 sm:flex-none` para preencher linha.
- Encurtar rótulos: "Agrupar Colaborador" → "Agrupar" no mobile (esconder texto extra com `hidden sm:inline`).

### 5. Tabela "Registros" — visão alternativa em mobile
- Em mobile (`useIsMobile()`), substituir a `<Table>` por uma **lista de cards** (um card por registro) mostrando:
  - linha 1: data + valor (destaque à direita);
  - linha 2: colaborador;
  - linha 3: CC · Tipo;
  - linha 4: origem → destino · cia;
  - rodapé: ações (Editar/Excluir) se disponíveis.
- Em desktop, manter a tabela atual.
- Para o modo "Agrupar Colaborador" em mobile, manter o cabeçalho do grupo expansível e exibir cards filhos quando aberto.

### 6. Sheet de detalhes do agrupamento
- Tabela interna ganha `overflow-x-auto`; em mobile reduzir paddings e font-size das colunas %.

### 7. Página compartilhada
- Como reusa o `PassagensDashboard`, herda automaticamente as correções; nenhum ajuste extra previsto além de validar o header (já é simples).

### 8. QA visual
Após implementar, abrir o preview em viewports 375×812 e 414×896 (browser tools) e validar:
- KPI "Registros" sem sobreposição;
- Gráficos sem cortes;
- Lista de registros legível em mobile sem rolagem horizontal forçada;
- Botões do header não estourando.

## Detalhes técnicos

- Usar o hook existente `useIsMobile()` (`src/hooks/use-mobile.tsx`, breakpoint 768px) para alternar tabela ↔ cards e ajustar tamanhos de gráfico.
- Não criar cores hardcoded — manter tokens (`hsl(var(--primary))`, `text-muted-foreground`, etc.).
- Não tocar em `src/integrations/supabase/*` nem `.env`.
- Mudanças concentradas em:
  - `src/components/passagens/PassagensDashboard.tsx` (principal)
  - `src/pages/PassagensAereasPage.tsx` (header de ações)

Nenhuma mudança de banco de dados ou edge function é necessária.
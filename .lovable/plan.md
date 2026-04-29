# Cards de KPI simétricos em Passagens Aéreas

## Problema

Hoje, no grid de KPIs (`src/components/passagens/PassagensDashboard.tsx`, linhas ~472–510), os 4 cards estão num `grid md:grid-cols-4`, mas o card **Registros** está embrulhado num wrapper extra:

```
<div className="relative flex flex-col gap-2">
  <KPICard ... />
  <div>  Select "Centro de…" + botão Layers  </div>
</div>
```

Esse wrapper adiciona uma barra de controles **abaixo** do card, fazendo com que:
- O card Registros fique mais alto que os outros 3 (assimetria vertical).
- O alinhamento da linha quebre — visível no print enviado, onde "Centro de…" e o ícone de avião aparecem fora/abaixo do card.
- Em desktop os cards parecem do mesmo tamanho horizontal, mas verticalmente o Registros é maior.

## Objetivo

Os 4 cards devem ter **mesma altura, mesma largura e mesmo padding interno**, formando uma linha simétrica.

## Solução

Mover os controles de agrupamento (Select + botão Layers) para **dentro** do card Registros, posicionados de forma compacta no topo direito do card, sem aumentar a altura.

### Mudanças em `src/components/passagens/PassagensDashboard.tsx`

1. **Grid de KPIs (linha 472)**: adicionar `items-stretch` para garantir que todos os filhos esticam à mesma altura:
   ```tsx
   <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-stretch">
   ```

2. **Card Registros (linhas 474–507)**: remover o wrapper `<div className="relative flex flex-col gap-2">` e os controles externos. O `KPICard` passa a receber os controles via uma prop existente (`action`/`headerAction`) ou, se não houver, via um wrapper `relative` que posiciona os controles **absolutamente** dentro do card (canto superior direito), igual a como aparece no print do usuário (onde o select "Centro de…" já está visível dentro da área do card):
   
   ```tsx
   <div className="relative">
     <KPICard
       title="Registros"
       value={totalRegistros}
       icon={<Plane className="h-5 w-5" />}
       variant="info"
       index={1}
       subtitle={`${gruposCount} ${groupOption.label}${gruposCount === 1 ? '' : 's'}`}
     />
     <div className="absolute right-3 top-3 flex items-center gap-1">
       <Select ...> ... </Select>
       <Button size="icon" variant="ghost" className="h-7 w-7" ...>
         <Layers className="h-4 w-4" />
       </Button>
     </div>
   </div>
   ```
   
   - O `Select` mantém `h-7 text-xs w-[130px]` para caber no canto sem ocupar muito espaço.
   - Em mobile (já tratado por `useIsMobile`), os controles continuam empilhados abaixo do KPI como antes — manter o caminho mobile atual; alterar apenas o caminho desktop.

3. **Verificação visual**: após a mudança, os 4 cards (Total Geral, Registros, Colaboradores, Ticket Médio) compartilham a mesma altura porque nenhum tem mais wrapper extra; o `grid` aplica `1fr` em cada coluna e `items-stretch` força altura uniforme.

## Arquivos afetados

- `src/components/passagens/PassagensDashboard.tsx` (apenas o bloco do grid de KPIs, ~linhas 472–510)

## Fora do escopo

- Não mexer no `KPICard` base (`src/components/erp/KPICard.tsx`).
- Não mexer no layout mobile já implementado anteriormente.
- Não mexer em gráficos, tabela, exportações.

# Filtros colapsáveis em Passagens Aéreas

## Problema

Hoje o Card de filtros do topo (`src/components/passagens/PassagensDashboard.tsx`, linhas ~342–440) está sempre expandido, ocupando bastante espaço vertical com 6 campos (Colaborador, Centro de Custo, Tipo, Mês, Data início, Data fim) + botão Limpar. O usuário quer poder esconder esse painel e reabrir só quando precisar.

## Solução

Transformar o Card de filtros em um painel colapsável, com cabeçalho clicável para minimizar/maximizar, mantendo o estado dos filtros ativos visíveis mesmo quando colapsado.

### Comportamento

- **Estado inicial**: aberto se houver pelo menos um filtro do topo ativo (`hasTopFilter`); senão, fechado por padrão para liberar espaço.
- **Cabeçalho sempre visível** (mesmo colapsado), contendo:
  - Ícone de filtro + título "Filtros".
  - Contador discreto de filtros ativos (ex.: "3 ativos") em `Badge` quando houver.
  - Botão de chevron (`ChevronDown`/`ChevronUp`) à direita indicando estado.
  - O cabeçalho inteiro é clicável (toggle).
- **Conteúdo colapsado**: o grid dos 6 campos + botão Limpar somem (`hidden`), reduzindo o card a uma única linha de altura.
- **Conteúdo expandido**: comportamento atual sem alterações.
- **Persistência da escolha**: salvar o estado em `localStorage` na chave `passagens:filtros-aberto` para que a preferência do usuário permaneça entre sessões.
- **Limpar**: ao clicar em "Limpar tudo" enquanto aberto, mantém aberto. O badge de filtros do gráfico (`hasCrossFilter`, linhas 442–470) continua aparecendo independente, fora do card colapsável.

### Mudanças em `src/components/passagens/PassagensDashboard.tsx`

1. Adicionar estado `filtrosAbertos` com inicialização a partir do `localStorage` (fallback: `hasTopFilter` ou `false`).
2. Persistir mudanças via `useEffect` gravando em `localStorage`.
3. Envolver o `<Card>` (linha 342) num bloco com cabeçalho próprio:
   ```tsx
   <Card>
     <button
       type="button"
       onClick={() => setFiltrosAbertos(v => !v)}
       className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-accent/40"
     >
       <span className="flex items-center gap-2">
         <Filter className="h-4 w-4" />
         Filtros
         {hasTopFilter && (
           <Badge variant="secondary" className="ml-1 h-5 text-xs">
             {countAtivos} ativo{countAtivos === 1 ? '' : 's'}
           </Badge>
         )}
       </span>
       {filtrosAbertos
         ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
         : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
     </button>
     {filtrosAbertos && (
       <CardContent className="space-y-3 p-4 pt-0 border-t">
         {/* grid existente dos 6 campos + botão Limpar */}
       </CardContent>
     )}
   </Card>
   ```
4. Calcular `countAtivos` simples (soma dos filtros do topo preenchidos) para o badge.
5. Importar `ChevronDown`, `ChevronUp` e `Filter` do `lucide-react` (verificar se já estão importados; senão adicionar).

## Arquivos afetados

- `src/components/passagens/PassagensDashboard.tsx` — apenas o bloco de filtros do topo (~linhas 340–440) e os imports.

## Fora do escopo

- Não alterar lógica de filtragem, KPIs, gráficos, tabela ou cross-filters.
- Não alterar o painel "Filtros do gráfico" (que já tem comportamento próprio com badges).
- Não mexer no layout mobile específico além do herdado naturalmente (o cabeçalho colapsável funciona igual em mobile e desktop).

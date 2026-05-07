## Objetivo

Permitir clicar em um segmento/barra/fatia dos gráficos da tela de Notas Fiscais de Recebimento e abrir automaticamente a aba **Drill-down Gerencial** já posicionada no nível correto, com aquele valor selecionado como passo inicial do drill.

## Mapeamento gráfico → nível do drill

| Gráfico | Nível do drill aberto | Valor selecionado |
|---|---|---|
| Recebimentos por Mês (BarChart) | `mes` | mês clicado |
| Tipo de Despesa (PieChart) | `tipo_despesa_calc` | fatia clicada |
| Top Fornecedores (BarChart) | `fornecedor` | barra clicada |
| Top Centros de Custo (BarChart) | `centro_custo` | barra clicada |
| Top Projetos (BarChart) | `projeto` | barra clicada |
| Transação NF (BarChart) | `transacao` | barra clicada |

## Mudanças técnicas

**1. `src/components/erp/GenericDrillView.tsx`**
- Aceitar prop opcional `initialStack?: Step[]` e prop `onStackChange?: (stack) => void` (controlado externamente via `value`/`onChange` para permitir que cliques no gráfico mudem o stack).
- Alternativa mais simples: aceitar prop `seed` (chave + valor + label) que, quando muda, faz `setStack` para `[{ nivel, chave, label }]` e ignora se o nível não existir em `niveis`.
- Manter compatibilidade total: sem props novas, comportamento atual.

**2. `src/pages/NotasRecebimentoPage.tsx`**
- Estado novo: `const [drillSeed, setDrillSeed] = useState<{ nivel: string; chave: string; label: string } | null>(null)`.
- Função `openDrill(nivel, chave, label)` que: seta `drillSeed`, chama `setActiveTab('drill')` e dá scroll suave até a tabela.
- Adicionar handler `onClick` em cada `<Bar>` / `<Pie>`:
  - `BarChart` mês: `<Bar onClick={(d) => openDrill('mes', d.mes, d.mes)} cursor="pointer">`.
  - `PieChart` tipo despesa: `<Pie onClick={(d) => openDrill('tipo_despesa_calc', d.label, d.label)}>` com `cursor: pointer` em cada Cell.
  - Bars de fornecedor/CC/projeto/transação: idem, usando o campo correspondente do datapoint.
- Adicionar tooltip hint ("Clique para detalhar") no `ChartCard` ou via `cursor-pointer` no container.
- Indicação visual: `cursor: pointer` nos elementos clicáveis e leve `hover` opacity (já vem do Recharts via `activeBar`).

**3. Comportamento esperado (validação)**
- Filtros globais continuam aplicados — o drill opera sobre `dados` filtrado.
- Botão "Limpar drill" dentro do `GenericDrillView` continua zerando o stack (sobrescreve o seed).
- Trocar de gráfico sobrescreve o seed (entrada única no stack inicial — usuário ainda pode aprofundar a partir dali).
- Clicar duas vezes no mesmo segmento não duplica.
- Mobile: cliques funcionam por toque; sem mudança de layout.

## Arquivos alterados

- `src/components/erp/GenericDrillView.tsx` — adicionar prop `seed` controlada via `useEffect`.
- `src/pages/NotasRecebimentoPage.tsx` — handlers `onClick` nos gráficos, estado `drillSeed`, `openDrill`, troca automática de aba.

Sem novos endpoints, sem mocks, sem alteração das 12 validações anteriores.

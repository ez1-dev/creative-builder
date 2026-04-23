

## Adicionar contexto automático da rota atual em todas as páginas

### Estado atual
A infraestrutura já existe e funciona:
- `AiPageContextProvider` + `useAiPageContext` hook (já criados).
- Edge function `ai-assistant` já injeta `pageContext` no system prompt.
- `EstoquePage` é a única que registra contexto hoje.

Falta: **chamar `useAiPageContext` nas demais páginas** para que o assistente "veja" KPIs, filtros e resumos em qualquer rota que o usuário acessar.

### Páginas-alvo (todas com filtros/KPIs)
Mapeei as páginas em `src/pages/` que devem registrar contexto:

| Página | Module key | Contexto a registrar |
|---|---|---|
| `PainelComprasPage` | `painel-compras` | filtros, KPIs (Total OCs, Valor Aberto, Pendentes), top fornecedor |
| `ComprasProdutoPage` | `compras-produto` | filtros, total registros, último custo médio |
| `OndeUsaPage` | `onde-usa` | filtros (codcmp, dercmp), nº de modelos encontrados |
| `EngenhariaProducaoPage` | `engenharia-producao` | filtros, KPIs (Atendeu/Parcial/Sem produção), unidade de negócio |
| `EstoqueMinMaxPage` | `estoque` | filtros, qtd críticos, qtd acima do max |
| `SugestaoMinMaxPage` | `estoque` | filtros, total sugestões, valor estimado |
| `ContasPagarPage` | (sem tool) | filtros, total aberto, vencidos, top fornecedor |
| `ContasReceberPage` | (sem tool) | filtros, total a receber, vencidos, top cliente |
| `NotasRecebimentoPage` | (sem tool) | filtros, qtd notas, valor total |
| `ConciliacaoEdocsPage` | (sem tool) | filtros, qtd divergências |
| `AuditoriaTributariaPage` | (sem tool) | filtros, qtd inconsistências |
| `AuditoriaApontamentoGeniusPage` | (sem tool) | filtros, qtd apontamentos divergentes |
| `BomPage` | (sem tool) | modelo selecionado, nº componentes |
| `NumeroSeriePage` | (sem tool) | OP/Pedido, nº reservas |
| `producao/ProducaoDashboardPage` | (sem tool) | filtros, KPIs do dashboard |
| `producao/ExpedidoObraPage` | (sem tool) | filtros, total expedido |
| `producao/LeadTimeProducaoPage` | (sem tool) | filtros, lead time médio |
| `producao/ProduzidoPeriodoPage` | (sem tool) | filtros, qtd produzida |
| `producao/SaldoPatioPage` | (sem tool) | filtros, qtd em pátio |
| `producao/NaoCarregadosPage` | (sem tool) | filtros, qtd itens não carregados |
| `ConfiguracoesPage` | — | só título e aba ativa |
| `Index` | — | só título "Página inicial" |

### Padrão de implementação (uniforme)

Em cada página, adicionar logo após o `useState` dos filtros/data:

```tsx
import { useAiPageContext } from '@/hooks/useAiPageContext';

useAiPageContext({
  title: 'Painel de Compras',
  module: 'painel-compras', // omitir se não houver tool
  filters,
  kpis: data?.resumo ? {
    'Total OCs': data.resumo.total_ocs,
    'Valor Aberto': formatCurrency(data.resumo.valor_aberto),
    'Pendentes': data.resumo.pendentes,
  } : undefined,
  summary: data
    ? `${data.total_registros} registros exibidos${
        data.dados?.[0] ? `; primeiro: ${data.dados[0].fornecedor}` : ''
      }`
    : undefined,
});
```

### Regras
1. **Sempre passar `title`** (igual ao `PageHeader`).
2. **Passar `module`** apenas quando existir no enum da edge function (estoque, painel-compras, onde-usa, compras-produto, engenharia-producao). Para as demais, omitir → o assistente responde via texto/markdown sem tool.
3. **`filters`** sempre é o objeto de state local — o hook serializa.
4. **`kpis`** só quando há `data?.resumo` (guard). Valores formatados (com R$, %, etc.).
5. **`summary`** texto curto (1 linha) com nº de registros + primeira linha relevante (fornecedor, projeto, item).
6. **Não registrar dados sensíveis** (CPF/CNPJ completo, valores individuais de cada cliente). Apenas agregados.
7. **Páginas sem dados carregados** (estado inicial) registram só `title + filters` para que o assistente saiba onde está.

### Ajuste opcional na edge function
O `BASE_SYSTEM_PROMPT` já fala dos 5 módulos com tool. Vou adicionar uma frase orientando o modelo a **usar `pageContext.summary` e `pageContext.kpis`** quando o usuário fizer perguntas analíticas tipo "qual o total?", "quantos registros?", "qual o maior?" — sem inventar números.

### Arquivos a alterar (~21 arquivos, edits pequenos)
- `src/pages/PainelComprasPage.tsx`
- `src/pages/ComprasProdutoPage.tsx`
- `src/pages/OndeUsaPage.tsx`
- `src/pages/EngenhariaProducaoPage.tsx`
- `src/pages/EstoqueMinMaxPage.tsx`
- `src/pages/SugestaoMinMaxPage.tsx`
- `src/pages/ContasPagarPage.tsx`
- `src/pages/ContasReceberPage.tsx`
- `src/pages/NotasRecebimentoPage.tsx`
- `src/pages/ConciliacaoEdocsPage.tsx`
- `src/pages/AuditoriaTributariaPage.tsx`
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`
- `src/pages/BomPage.tsx`
- `src/pages/NumeroSeriePage.tsx`
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/NaoCarregadosPage.tsx`
- `src/pages/ConfiguracoesPage.tsx`
- `src/pages/Index.tsx`
- `supabase/functions/ai-assistant/index.ts` — pequeno ajuste no prompt para reforçar uso do `summary/kpis`

### Fora de escopo
- Persistência das conversas (pacote 2).
- Quick actions dinâmicas (pacote 2).
- Captura de top-N linhas da tabela (atual: só `summary` agregado).

### Resultado esperado
O usuário pode perguntar em **qualquer página** coisas como:
- "Qual o valor total em aberto nesta tela?" → resposta usa `kpis['Valor Aberto']`.
- "Quantos registros foram filtrados?" → resposta usa `summary`.
- "Resuma esta tela." → assistente descreve título, filtros ativos e KPIs.
- "Mostre apenas vencidos." → continua usando `apply_erp_filters` quando o módulo tem tool.

Tudo respeitando as permissões já existentes (`ai_enabled` por perfil + acesso por rota).


## Objetivo

Redesenhar a página **Nova Requisição — com OP** (`/requisicoes/nova-op`) seguindo o layout de referência enviado: layout mais denso e informativo, com 3 colunas, tabela de OPs à esquerda, painel "Resumo da OP" ao centro, "Resumo da Requisição" à direita, e tabela de componentes ampla embaixo com legenda de saldo colorida.

## Mudanças de layout (visual only — sem tocar em regras de negócio)

### Passo 1 — Selecionar OP
Trocar o layout atual (autocomplete + campos manuais empilhados) por um layout de 3 colunas:

```text
┌──────────────────────────┬───────────────────────┬───────────────────────┐
│ [Buscar OP] [Manual]     │ Resumo da OP          │ Resumo da Requisição  │
│ 🔍 campo de busca        │ selecionada           │ (sticky)              │
│ Lista de resultados      │ Origem / Nº OP        │ Itens selecionados    │
│  100/65958  Estrutura    │ Produto final         │ Quantidade total      │
│  100/65960  Suporte      │ Derivação             │ Itens com/sem saldo   │
│  200/12020  Base fixação │ Projeto/Obra          │ Acima da necessidade  │
│  ...                     │ Qtd prevista/produzida│ Tipo atendimento      │
│  (rows clicáveis c/      │ Saldo da OP           │ Depósito destino      │
│   badge de situação)     │ [Trocar OP][Atualizar]│ [Salvar rascunho]     │
│                          │                       │ [Cancelar][Continuar] │
└──────────────────────────┴───────────────────────┴───────────────────────┘
```

- **Coluna esquerda**: tabs "Buscar OP" / "Informar manualmente" + campo de busca grande + lista de resultados (usa `searchOps` já existente com `sit_orp: 'A'`). Cada linha mostra Origem/Nº, produto, projeto, badge "Previsto X un" e situação colorida. Clicar = selecionar OP.
- **Coluna central "Resumo da OP selecionada"**: card com todos os metadados vindos de `useImpressaoOrdemProducao` (origem, nº, produto final, derivação, projeto/obra, qtd prevista, qtd produzida, saldo da OP). Badge "Liberada / Aberta / Em execução". Botões "Trocar OP" e "Atualizar dados".
- **Coluna direita "Resumo da Requisição"** (sticky): KPIs zerados até seleção de componentes (itens selecionados, quantidade total, itens com/sem saldo, acima da necessidade, tipo de atendimento, depósito destino) + botões Salvar rascunho / Cancelar / Continuar.

### Tabela de componentes (largura total, abaixo dos 3 painéis)
- Toolbar: `Filtros` | busca por produto | checkboxes "Somente pendentes" / "Com saldo" | "Selecionar todos".
- Colunas: Sel · Seq · Estágio · Componente · Descrição · Deriv · Depósito · Prev · Utiliz · Requis · Transf · Disponível · **Solicitar** (input) · Obs.
- Ponto colorido no início da linha indicando saldo (`sem saldo` vermelho, `parcial` laranja, `suficiente` verde, `já atendido` cinza).
- Linha destacada em amarelo quando `Solicitar > Disponível` (aviso "Acima da necessidade") e em vermelho quando `Fora de saldo`.
- Legenda de status embaixo + "Total de itens: N".

### Banner de integração
- Manter o `IntegracaoStatusChip` admin no topo, mas em versão compacta (ícone + texto curto) alinhada à direita do stepper.
- Manter o banner informativo azul embaixo ("A integração com o ERP está desabilitada. As requisições serão salvas como pendentes de integração…") — reaproveitar componente existente.

## Componentes a criar/ajustar (só apresentação)

- `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` — reorganizar em grid 3 colunas + tabela full-width. Nada muda na lógica de fetch, mutações, gating de SID ou cálculos.
- `src/components/requisicoes/OpSearchList.tsx` (novo) — lista visual de OPs (usa `searchOps` existente).
- `src/components/requisicoes/ResumoOpCard.tsx` (novo) — extrai a apresentação do painel central. Consome os dados já retornados por `useImpressaoOrdemProducao`.
- `src/components/requisicoes/ComponentesTable.tsx` — ajustar visual (ponto colorido, highlight de linhas, colunas conforme imagem). Mantém mesmos campos e cálculos.
- `ResumoRequisicaoLateral.tsx` — leve reestilização para bater com a referência (labels/tipografia); sem novas métricas.

## O que NÃO muda

- Endpoints e payloads (`/api/producao/ordem-producao/opcoes`, `/impressao`, mutações de requisição).
- Regras de gating do SID, integração, aprovações.
- Cálculos de saldo, "Acima da necessidade", tipo de atendimento.
- Stepper de 4 etapas (continua igual, só reposicionado no topo do card).

## Observações

- Os dados exibidos na imagem (100/65958, projetos GS-11661, etc.) são exemplos — o layout aceita qualquer OP real vinda da API.
- Todas as cores via tokens semânticos do design system (nada de `bg-white`/`text-black` hardcoded).
- Trabalho puramente frontend/presentational.

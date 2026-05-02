## Painel de Compras — Multi-situação e filtro de Depósito

Duas mudanças no filtro do **Painel de Compras** (`src/pages/PainelComprasPage.tsx`):

### 1. Situação da OC com múltipla seleção

Hoje o filtro "Situação da OC" é um `Select` simples (uma opção ou "Todas"). Vou trocar por um **dropdown com checkboxes** (Popover + Checkbox), permitindo marcar várias situações simultaneamente.

- O estado `situacao_oc` passa de `string` (`'TODOS' | '1' | ... | '9'`) para `string[]` (lista de códigos selecionados; vazio = todas).
- Botão de trigger mostra:
  - `"Todas"` quando vazio,
  - `"Aberto Total"` quando uma única,
  - `"3 selecionadas"` quando múltiplas (com tooltip listando os nomes).
- Atalho rápido "Selecionar todas / Limpar" dentro do popover.
- Auto-desmarca `somente_pendentes` quando "Liquidado" (4) for incluído (mantém o comportamento atual).

### 2. Envio ao backend

A API `/api/painel-compras` hoje recebe `situacao_oc` como string única. Para enviar várias:

- Se 0 selecionadas → não envia o parâmetro (= todas).
- Se 1 selecionada → envia `situacao_oc=4` (compatível com o atual).
- Se 2+ selecionadas → envia como CSV: `situacao_oc=1,2,3`.

Como não temos certeza de que o backend aceita CSV, vou também aplicar **fallback de filtro client-side** (igual ao já existente para `tipo_item`): após receber a resposta, se houver mais de uma situação selecionada, filtro `data.dados` localmente por `situacao_oc ∈ selecionadas` e recalculo `resumo` da página corrente. Aviso `toast.warning` único caso o backend devolva linhas fora do conjunto. Isso garante que a tela funcione hoje, mesmo antes de ajuste no FastAPI.

(Recomendo que depois eu gere um doc `docs/backend-painel-compras-situacao-multi.md` descrevendo o contrato `situacao_oc` aceitando CSV/lista, para o backend remover a mitigação.)

### 3. Novo filtro: Depósito

Adicionar campo de texto **"Depósito"** no `FilterPanel`, ao lado de "Origem"/"Família":

- Estado: `coddep: ''` (consistente com `EstoquePage` / `EstoqueMinMaxPage` que já usam `coddep`).
- Input livre (mesmo padrão das outras páginas — não há combobox de depósitos hoje).
- Enviado ao backend como `coddep` (omitido quando vazio).
- Caso o backend não conheça o parâmetro, ele simplesmente o ignora — sem regressão. Vou registrar em `docs/backend-painel-compras-deposito.md` a sugestão de contrato (`coddep` mapeando para `E300OCP.CODDEP` ou equivalente da OC).

### Arquivos alterados

- `src/pages/PainelComprasPage.tsx` — único arquivo de UI tocado.
- `docs/backend-painel-compras-situacao-multi.md` — novo, descreve contrato CSV de `situacao_oc`.
- `docs/backend-painel-compras-deposito.md` — novo, descreve novo parâmetro `coddep`.

### Detalhes técnicos

- Componente do popover: `Popover` + `Checkbox` (já em `@/components/ui`). Sem dependência nova.
- `clearFilters` reseta `situacao_oc: []` e `coddep: ''`.
- `useAiFilters` recebe array — confiro que ele apenas faz `setFilters({...})`, então qualquer formato passa pelo state (já é genérico).
- O drilldown do KPI "Total OCs" e o gráfico de "Situações" continuam usando `chartData.situacoes`, que é montado a partir de `data.dados` — funciona automaticamente com o filtro client-side aplicado.
- Onde hoje há `params.situacao_oc === 'TODOS'` substituo por `Array.isArray(params.situacao_oc) && params.situacao_oc.length === 0`.

Confirma para eu implementar?
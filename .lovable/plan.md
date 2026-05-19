# Plano — Painel de Compras: filtros como autocomplete do cadastro Senior

## Objetivo
Trocar os 4 inputs livres (Fornecedor, Centro de Custo, Depósito, Transação) do `PainelComprasPage` por um combobox tipo autocomplete que busca em endpoints REST de cadastros do ERP Senior. A seleção envia **apenas o código** para o filtro existente (`fornecedor`, `centro_custo`, `coddep`/`deposito`, `transacao`).

## Backend esperado (a ser implementado no FastAPI)
Quatro novos endpoints retornando array `[{ codigo, descricao, label, ... }]`. Suportam query `?q=` (filtro por código OU descrição, case-insensitive, LIKE) e limit padrão 50.

| Endpoint | Tabela | Campos | label |
|---|---|---|---|
| `GET /api/cadastros/fornecedores?q=` | `E095FOR` (ativos: `SitFor='A'` se existir) | `codigo=CodFor`, `descricao=NomFor`, `fantasia=ApeFor` | `"CodFor - NomFor"` |
| `GET /api/cadastros/centros-custo?q=` | `E044CCU` | `codigo=CodCcu`, `descricao=DesCcu` | `"CodCcu - DesCcu"` |
| `GET /api/cadastros/depositos?q=` | `E205DEP` | `codigo=CodDep`, `descricao=DesDep` | `"CodDep - DesDep"` |
| `GET /api/cadastros/transacoes-compras?q=` | `E001TNS` filtrando transações de compras (ex.: `IdePrc IN ('1','C')` ou via uso em `E140IPD`) | `codigo=CodTns`, `descricao=DesTns` | `"CodTns - DesTns"` |

Criar `docs/backend-cadastros-autocomplete.md` documentando assinatura, exemplos de resposta, SQL de referência e necessidade de índice por (codigo, descricao). **Nada de implementação backend feita pelo Lovable** — apenas a doc + o consumo no frontend.

## Frontend

### 1. Novo componente `src/components/erp/AutocompleteAsync.tsx`
Combobox genérico para "search-as-you-type" com fetch debounced (300ms), baseado em `Popover` + `Command` (mesmo estilo do `ComboboxFilter` atual).
- Props: `value: string` (código atual), `onChange(code: string)`, `fetcher: (q: string) => Promise<Option[]>`, `placeholder`, `loadingInitialLabel?: string`.
- `Option = { codigo: string; descricao: string; label: string; fantasia?: string }`.
- Exibe `label` na lista, mostra o `label` do item selecionado no botão (cache local da última seleção para evitar refetch só pra mostrar nome).
- Botão "X" para limpar (chama `onChange('')`).
- Busca casa por `codigo` ou `descricao`.

### 2. Novo hook `src/hooks/useCadastrosErp.ts`
Exporta funções fetcher (todas usam `api.get` com `?q=`):
- `fetchFornecedores(q)`, `fetchCentrosCusto(q)`, `fetchDepositos(q)`, `fetchTransacoesCompras(q)`.
Cada uma normaliza a resposta para `Option[]`. Inclui in-memory cache LRU pequeno por (endpoint, q) com TTL 5 min para reduzir chamadas. Em caso de 404/500 retorna `[]` (não quebra a tela; toast silencioso só em erro de rede).

### 3. `src/pages/PainelComprasPage.tsx`
- Remover o uso de `useFornecedores` (que retornava `fantasia` como value) e a normalização atual para fornecedor.
- Trocar os 4 inputs/combobox nas linhas 948, 950, 953 e 969 por `AutocompleteAsync` apontando para o fetcher correspondente.
- `filters.fornecedor`, `filters.centro_custo`, `filters.coddep`, `filters.transacao` passam a guardar **apenas o código** (ex.: `'12345'`). Os chips ativos (`ActiveFilterChips`) continuam mostrando o código + label cacheado.
- Manter botão "Limpar" do filtro global e o "X" individual.
- Sem mudanças nas chamadas para `/api/painel-compras*` — o backend já recebe esses 4 campos com o nome correto; só muda o valor (passa de "nome do fornecedor" para `CodFor`).

### 4. Sem mudanças em
- `useFornecedores` legado (deixar arquivo, ainda usado para popular dropdown derivado dos dados retornados em outros lugares? Conferir: hoje só é usado no `PainelComprasPage`. Se ficar órfão, deletar.) → confirmarei na implementação e removo se ninguém mais usar.
- Outras páginas/contas/etc. — escopo restrito ao painel.

## Pontos importantes
- O endpoint do painel atualmente recebe `coddep` (não `deposito`). Vou manter `coddep` no envio para não quebrar nada; se o backend padronizar para `deposito`, basta renomear a chave no `filters`.
- O combobox de fornecedor antigo enviava a fantasia como filtro string — isso mudará para o `CodFor`. **Verificar se o backend do painel já filtra por código quando o valor é numérico** — espero que sim (campo `CodFor` é numérico); se filtrar só por substring no nome, a troca rebaixa resultados. A doc `backend-cadastros-autocomplete.md` deixará claro que o `fornecedor` no `/api/painel-compras` deve aceitar `CodFor`.

## Fora de escopo
- Implementação real dos 4 endpoints FastAPI (cabe ao backend).
- Mexer em filtros de outras telas (Contas a Pagar, Estoque etc.) — embora o `AutocompleteAsync` fique disponível para reúso futuro.
- Mudança no esquema de logs/tracking.

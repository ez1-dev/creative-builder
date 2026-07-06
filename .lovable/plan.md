
## Objetivo

Ampliar o módulo **Manutenção de Frota** para acomodar três tipos de lançamento — **Manutenção veículo**, **Combustível** e **Pedágio** — com filtro por categoria, importação dedicada por planilha e um dashboard reorganizado conforme o pedido.

## 1. Backend (Lovable Cloud)

Migration nova em `supabase/migrations/`:

- `ALTER TABLE public.manutencao_frota ADD COLUMN categoria text` com CHECK `IN ('MANUTENCAO','COMBUSTIVEL','PEDAGIO')`.
- Backfill: todos os registros existentes → `categoria = 'MANUTENCAO'`.
- `ALTER COLUMN categoria SET NOT NULL` + `DEFAULT 'MANUTENCAO'`.
- `CREATE INDEX manutencao_frota_categoria_idx ON public.manutencao_frota(categoria)`.
- Sem alteração em GRANTs/RLS (herda os atuais).

Campo `segmento` continua livre (FROTA / GENIUS / OBRA). `tipo_veiculo` continua livre (aceita "Cavalo Mecânico", "Utilitário/Passeio", "Passeio" etc. — hoje já é `text`).

## 2. Tipos (frontend)

`ManutencaoFrota` em `src/components/frota/FrotaDashboard.tsx`:

- Adicionar `categoria: 'MANUTENCAO' | 'COMBUSTIVEL' | 'PEDAGIO'`.
- Constantes utilitárias:

```ts
export const CATEGORIA_OPTIONS = [
  { value: 'MANUTENCAO', label: 'Manutenção veículo' },
  { value: 'COMBUSTIVEL', label: 'Combustível' },
  { value: 'PEDAGIO', label: 'Pedágio' },
] as const;
```

## 3. Importação — `ImportarFrotaDialog.tsx`

Reescrever o dialog para trabalhar por **categoria escolhida antes do upload**:

- Passo 1: usuário escolhe a categoria (radio: Manutenção / Combustível / Pedágio).
- Passo 2: upload do arquivo. Cada categoria tem seu mapa de colunas e regras:

| Categoria    | Colunas aceitas na planilha                                                                                                                    | Regras                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Manutenção   | Data, Placa, Fornecedor, Descrição, Quilometragem (KM), Valor, Motorista, C.Custo, Segmento, Tipo Veículo                                     | comportamento atual                                                                        |
| Combustível  | DATA, PLACA, FORNECEDOR, DESCRIÇÃO, KM, MOTORISTA, C.CUSTO, SEGMENTO, TIPO VEÍCULO                                                             | **Valor = 0** (planilha não traz valor; edição manual depois)                              |
| Pedágio      | DATA, PLACA, FORNECEDOR, DESCRIÇÃO, VALOR ORIGINAL, MOTORISTA, C.CUSTO, SEGMENTO, TIPO VEÍCULO, DÉBITO, CRÉDITO                                | `valor` = `VALOR ORIGINAL`; `quilometragem` = null                                          |

Todas gravam `categoria` conforme o passo 1. Placa continua sendo dividida por `-` (mantém `veiculo_descricao`). `tipo_veiculo` grava exatamente o texto da planilha (sem cair no classifier antigo). `classifyTipo` fica só como fallback quando planilha não tem a coluna.

Título/descrição do dialog e o botão "Importar" refletem a categoria selecionada.

## 4. Dashboard — `FrotaDashboard.tsx`

### 4.1 Filtro de categoria

Novo filtro na `FilterBar`: **MultiSelectFilter "Categoria"** com as 3 opções (Manutenção veículo / Combustível / Pedágio). Aplica antes do resto dos filtros.

### 4.2 Cross-filter

Adicionar `selCategoria: string[]` seguindo o mesmo padrão de `selSegmento`. Chip incluído em "Filtros ativos".

### 4.3 Gráficos (canônicos, na ordem pedida)

Blocos canônicos passam a ser:

1. **KPIs** (mantém: Total, Manutenções, Ticket médio, Veículos).
2. **`chart-evolucao-mensal`** — barras por mês (Jan..Dez ordenado). Já existe; segue.
3. **`chart-categoria`** — **novo**. Rosca com **% e valor** (mesmo estilo do módulo Passagens). Tela inteira (`w = 12`).
4. **`chart-tipo-veiculo`** — rosca com **% e valor** (padrão Passagens). Tela inteira (`w = 12`).
5. **`chart-top-placas`** — `RankingChartCard` (renomear o atual "Top Veículos por Valor" para "Placa — Ranking"; comportamento igual).
6. **`chart-top-fornecedores`** — Ranking (mantém).
7. **`chart-top-cc`** — Ranking (mantém).

Blocos removidos do layout canônico padrão: `chart-segmento` (segmento vira dimensão secundária, ainda disponível como widget custom via "Novo gráfico") e `chart-top-motoristas` (idem — não faz parte do pedido).

### 4.4 Modo "tela inteira" dos donuts

Confirmar que o `PieChartCard` já mostra `% + valor` como no módulo Passagens. Se ainda não, ativar as props equivalentes (`showValues`, `showPercent`) — o card usado é o mesmo componente da biblioteca BI.

No layout padrão salvo em `useFrotaLayout` (defaults), definir `layout.w = 12` para `chart-categoria` e `chart-tipo-veiculo` para que ocupem a linha inteira.

### 4.5 Registro (tabela) — colunas exatas pedidas

Substituir `cols` em `FrotaDashboard.tsx`:

`Data — Placa — Fornecedor — Descrição — Km — Valor — C.Custo — Segmento — Tipo Veículo`

Adicionar coluna **Categoria** ao final (rótulo amigável via `CATEGORIA_OPTIONS`). Remover a coluna Motorista da tabela principal (fica disponível via agrupamento e como filtro; se preferir manter, sinalizar). Ações (editar/excluir) permanecem à direita.

Ajustar exportações CSV/XLSX para refletir as mesmas colunas + Categoria.

## 5. `useFrotaLayout` e registry

- Adicionar `chart-categoria` ao array de canônicos e ao `CONFIGURABLE_CANONICAL`.
- Ajustar `pageRegistry` (`FROTA_DIMENSOES`) para incluir `categoria` como dimensão.
- `seriesPayload` passa a construir `por_categoria__valor` etc.
- Migração de layout: usuários que já têm layout salvo continuam com o antigo; ao restaurar o padrão, recebem o novo (com donut de categoria em tela inteira).

## 6. Página / formulário de edição

`src/pages/ManutencaoFrotaPage.tsx`:

- Adicionar select "Categoria" no form de criar/editar (obrigatório).
- Ao criar manualmente, default = `MANUTENCAO`.
- Persistir `categoria` no insert/update.

## 7. Fora de escopo

- Não altera backend FastAPI, RLS, ETL ou edge functions.
- Não altera o Relatório Executivo de Frota (usa os mesmos campos; passa a mostrar a categoria automaticamente quando presente, sem novos blocos).
- Sem mudanças em módulos vizinhos (Máquinas, Passagens).

## 8. Importação das 3 planilhas enviadas

Após o deploy da migration, você importa manualmente pela nova UI:

1. Categoria = Combustível → `COMBUSTÍVEL.xlsx` (751 linhas, valor=0).
2. Categoria = Manutenção → `MANUTENÇÃO.xlsx` (246 linhas).
3. Categoria = Pedágio → `PEDAGIO_NOVO.xlsx` (2656 linhas, valor = VALOR ORIGINAL).

## Detalhes técnicos

- Não há alteração em `src/integrations/supabase/{client,types}.ts` além do que o gerador refaz sozinho após a migration.
- Chart de rosca com % e valor: `PieChartCard donut showPercent showValue` (props já usadas nos widgets do módulo Passagens em `PassagensLayoutGrid`).
- Ordem dos meses continua usando `MESES_ORDER`.
- Placa continua deduzida por `splitPlaca` para preencher `veiculo_descricao`.

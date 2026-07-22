## Objetivo

Atualizar `src/pages/EstoquePage.tsx` para exibir os novos campos do endpoint `GET /api/estoque` (saldo real, reservas de OPs ativas, disponível, compras a receber, projetado, próxima entrega e situação do material), sem cálculos paralelos no frontend e sem tocar em `E210EST.QTDRES`.

## Arquivo alterado

Somente `src/pages/EstoquePage.tsx`.

## Mudanças

### 1. Filtros
Acrescentar em `filters`:
- `somente_com_reserva: false`
- `somente_com_compra: false`
- `somente_com_falta: false`
- `criticidade: 'todas'` (todas | com_falta | falta_sem_compra | compra_cobre | compra_insuficiente | com_reserva | com_compra)

Enviados ao backend em `search()` (nunca aplicados só na página carregada).

Regra de compatibilidade: quando `somente_com_reserva`, `somente_com_compra` ou `somente_com_falta` estiverem ativos, forçar `somente_com_estoque=false` e exibir toast informativo:
> "O filtro 'Somente com estoque' foi removido para incluir materiais reservados ou comprados com saldo zero."

### 2. Colunas da grid
Ordem final:
Produto · Descrição · Derivação · Depósito · Saldo físico · Reservado em OP · Disponível · A receber · Projetado · OPs reservando · Próxima entrega · Situação.

Leitura defensiva conforme spec §19 (`item.saldo ?? item.qtdest ?? 0`, `item.reservado ?? 0`, `item.disponivel ?? saldo`, etc.). Nenhum cálculo derivado — apenas fallback anti-quebra.

Formatação:
- Quantidades: `formatNumber(v, 3)` padrão pt-BR, negativos entre parênteses.
- Data: `dd/MM/yyyy`, `—` quando vazio.
- OPs reservando: `"N OP"` / `"N OPs"`.

Destaques (via classes de token do design system, sem cores hardcoded):
- `disponivel < 0` → `text-destructive font-semibold` (parênteses)
- `disponivel = 0` → `text-warning`
- `projetado < 0` → `text-destructive font-semibold`
- `reservado > 0` → badge/ícone OP
- `a_receber > 0` → badge/ícone compra

### 3. Coluna Situação
Badge derivado priorizando `item.falta_material` do backend; texto conforme spec §5:
- `disponivel < 0 && a_receber <= 0` → **Falta sem compra** (destructive)
- `disponivel < 0 && a_receber > 0 && projetado >= 0` → **Compra cobre a falta** (warning)
- `disponivel < 0 && a_receber > 0 && projetado < 0` → **Compra insuficiente** (destructive)
- `disponivel >= 0` → **Disponível** (success)

### 4. Tooltips
- Reservado em OP: "Quantidade ainda necessária em OPs abertas ou liberadas. OPs encerradas não são consideradas."
- A receber: "Quantidade pendente em ordens de compra ativas. Itens cancelados não são considerados."
- Próxima entrega: "Data de entrega mais próxima entre os itens de compra pendentes."

### 5. Ordenação
Adicionar select "Ordenar por" com atalhos enviados ao backend (`ordenar_por`, `ordem`):
Saldo físico · Reservado · Disponível · A receber · Projetado · Qtd OPs · Próxima entrega · Maior falta · Maior reserva · Maior a receber · Entrega mais próxima · Compra insuficiente.

### 6. KPIs (cards superiores)
Se `data.meta` (ou similar) trouxer totais globais, exibir: Itens consultados, Com reserva, Com falta, Com compra pendente, Compra cobre a falta, Compra insuficiente.

Se o backend não fornecer totais e houver paginação, prefixar o bloco com o rótulo **"Resultados da página atual"** e calcular somente sobre `dados` da página (contagem, não recalcula quantidades por item). Cards existentes (Total Registros / Itens na Página / Saldo Total) preservados.

### 7. Modal de detalhes
Ao clicar numa linha, abrir `Dialog` com todos os campos + nota explicativa:
> "Disponível = saldo físico menos reservas de OPs ativas. Projetado = disponível mais compras pendentes."

Sem números calculados no navegador — apenas texto conceitual.

### 8. Drill de OPs (futuro)
`ops_reservando` renderizado como `<button>` que hoje só mostra toast "Detalhamento de OPs em breve". Deixa a estrutura pronta para `GET /api/estoque/reservas-ops` sem consultar `E900CMO`.

### 9. Exportação
Manter `ExportButton` apontando para `/api/export/estoque` e propagar todos os novos filtros em `params` — a exportação continua sendo feita pelo backend com o conjunto completo, respeitando filtros e ordenação.

### 10. Estado vazio
Mensagens contextuais quando `somente_com_reserva` / `somente_com_compra` estiverem ativos e o retorno for vazio (§20).

### 11. Contexto para IA
Atualizar `useAiPageContext` com os novos KPIs e filtros.

## Fora de escopo

- Backend (endpoint `/api/estoque` já publicado).
- Outras páginas de estoque (`EstoqueMinMaxPage`, `SugestaoMinMaxPage`, dashboards).
- Cálculos derivados de `saldo`/`reservado`/`disponivel`/`projetado` — sempre vindos da API.
- Consulta direta a `E210EST.QTDRES` ou `E900CMO` — proibida.

## Critérios de aceite

Reproduzem a lista da especificação (§Critérios de aceite): TER005 exibindo Saldo 180 / Reservado 6.822 / Disponível -6.642 / A receber 6.898 / Projetado 256 / Situação "Compra cobre a falta"; BR128 sem reserva fantasma; filtros `somente_com_reserva`, `somente_com_compra` e `somente_com_falta` operando pelo backend; exportação com novas colunas; nenhum cálculo baseado em QTDRES no frontend.

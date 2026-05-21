## Escopo

Aplicar o pacote de correções da Impressão de Ordem de Produção. Frontend (Lovable) é alterado agora. Mudanças de API/FastAPI ficam apenas documentadas em `docs/backend-impressao-ordem-producao.md` como contrato a ser implementado fora do Lovable (backend FastAPI externo).

Arquivos principais:
- `src/components/producao/OpPrintSheet.tsx`
- `src/components/producao/op-print.css`
- `src/lib/producao/opImpressao.ts` (tipos)
- `docs/backend-impressao-ordem-producao.md` (contrato)

## 1. Desenhos em A4 retrato (Bloco 1)

- `opImpressao.ts`: já existe `OpDesenho.url_impressao`. Adicionar campos opcionais `layout_impressao?: 'A4_RETRATO' | string` e `rotacao_automatica?: boolean` para documentar o contrato.
- `OpPrintSheet.tsx` / `DrawingPage`:
  - Manter `getDrawingPrintUrl` que já prioriza `url_impressao || url`.
  - Quando `url_impressao` existir, NÃO aplicar nenhuma rotação CSS (`transform: rotate(...)`) nem heurística de "rotacionar paisagem". Renderizar o arquivo como veio.
  - Quando só `url` existir (sem `url_impressao`), manter o comportamento atual de fallback (sem regressão).
  - Garantir que cada desenho ocupe exatamente uma página A4 retrato (já tem `.op-drawing-page`).
- Documentar no `docs/backend-impressao-ordem-producao.md`:
  - Novo endpoint `GET /api/producao/ordem-producao/desenho/impressao-a4?arquivo=...` que devolve sempre A4 retrato.
  - Resposta do bloco `desenhos[]` deve trazer `url_impressao`, `layout_impressao: "A4_RETRATO"` e `rotacao_automatica: true`.

## 2. Cabeçalho da OP (Bloco 2)

`OpPrintSheet.tsx` → `renderHeader`:

- **Revisão**: trocar o rótulo "REV" do bloco lateral por "Rev:" e mostrar `cab.revisao || '-'`. Evita visualmente o "Rev Rev" quando o valor vier `"REV"` por erro do backend. Adicionar fallback: se `cab.revisao` for exatamente `"REV"` (case-insensitive), tratar como vazio e mostrar `-`.
- **Derivação**: adicionar nova linha no grid `op-header-data`: `Derivação: {cab.derivacao || '-'}`. Adicionar `derivacao?: string` em `OpCabecalho` (`opImpressao.ts`).
- **Produto x Descrição**: separar em duas linhas no header:
  - `Produto: {cab.produto}`
  - `Descrição: {cab.descricao || descSemCod}`
  - Remover a concatenação atual `${cod} - ${descSemCod || desc}`.

Documentar no markdown do backend: cabeçalho deve retornar `revisao`, `derivacao`, `produto`, `descricao` separados (já há `produto_descricao` opcional para compatibilidade).

## 3. Apontamento manual: 10 apontamentos em 2 linhas (Bloco 3)

`OpPrintSheet.tsx` → tabela `op-apontamento-table` dentro de `renderOperacao`:

Substituir a tabela atual (9 colunas × 20 linhas) por:

- **Colunas (7)**: Controle | Tempo Setup | QTD Produzida | Motivo Desvio | Operador | Check | OBS
- **Corpo**: 10 apontamentos. Cada apontamento = 2 `<tr>`:
  - Linha 1: primeira célula = `Início / Fim`, demais células vazias (Tempo Setup, QTD Produzida, Motivo Desvio, Operador, Check com `<span class="check-box"/>`, OBS).
  - Linha 2: primeira célula = `Refugo`, demais células vazias.
- Adicionar classe `op-apt-sep` na linha 2 (ou na linha 1 do próximo apontamento) para borda mais grossa entre apontamentos. Definir em `op-print.css`.
- Não criar colunas separadas para Início, Fim e Refugo.

## 4. Quebra de página de componentes (Bloco 4)

`OpPrintSheet.tsx`:

- Regra de `quebrarComponentes`: manter `componentes.length > 7` (ou flag explícita do backend).
- Modo padrão (sem `quebrarPorOperacao`), `quebrarComponentes = true`:
  - Hoje gera 3 blocos: página com indicação + página de componentes + página de operações. Reorganizar para 2 páginas:
    - Página 1: cabeçalho + operações + rodapé.
    - Página 2: cabeçalho + componentes + rodapé (`renderComponentesPage`).
  - Remover o `renderIndicacaoComponentesSeparados()` deste fluxo (não exibir a mensagem "Componentes impressos em página separada" quando há operações para imprimir antes).
- Modo `quebrarPorOperacao = true`:
  - Hoje, com `quebrarComponentes`, a primeira página de cada operação NÃO inclui componentes (já correto). Garantir que `renderComponentesPage()` venha depois de todas as operações (já está).
  - Remover qualquer página "vazia" só com a indicação de componentes separados nesse modo (não existe hoje, validar e manter).
- Modo `quebrarPorOperacao = true` + `quebrarComponentes = false`: componentes continuam impressos junto com cada operação (já está).
- Mensagem "Componentes impressos em página separada" só pode aparecer quando NÃO há `quebrarPorOperacao` e o usuário pediu explicitamente uma página única; na prática, removida do fluxo padrão.

## 5. Centralização das colunas de componentes (Bloco 5)

`op-print.css`: adicionar regras para a tabela de componentes (tanto inline quanto em `componentes-page`) centralizando Qtde. Prev., UN, Dep., Endereço. Hoje as duas primeiras já têm `text-align: center` inline; padronizar via CSS por classes nas `<th>/<td>` (`qtd-prev`, `unidade`, `deposito`, `endereco`) aplicadas em `OpPrintSheet.tsx`. Versão print também.

## 6. Tempos formatados e destaque (Bloco 6)

`opImpressao.ts`: adicionar `tmp_unit_formatado?: string` e `tmp_total_formatado?: string` em `OpOperacao`.

`OpPrintSheet.tsx` → `renderOperacao`:
- Render: `Tmp Unit: {op.tmp_unit_formatado || op.tmp_unit || '—'}` / `Tmp Total: {op.tmp_total_formatado || op.tmp_total || '—'}`.
- Aplicar classe `op-tempo-destaque` nas células `v` de Tmp Unit/Total.

`op-print.css`: classe `.op-tempo-destaque` com `font-size: 11px; font-weight: 700;` (e versão `pt` no `@media print`).

Documentar no backend a função `formatar_tempo_decimal_horas` e os campos `tmp_unit_formatado`/`tmp_total_formatado`.

## 7. Documentação de backend

Atualizar `docs/backend-impressao-ordem-producao.md` com:
- Novo endpoint `/desenho/impressao-a4` + campos `url_impressao`, `layout_impressao`, `rotacao_automatica`.
- Cabeçalho: campos `revisao`, `derivacao`, `produto`, `descricao` separados.
- Operação: `tmp_unit_formatado`, `tmp_total_formatado`.

## Fora de escopo

- Implementação real do FastAPI (apenas documentação do contrato).
- Mudanças em filtros, autocomplete de OP, impressão em lote (lógica `OpPrintBatch` permanece igual).
- Estilo geral do layout além das classes citadas.
- Lógica de seleção/listagem de OPs.

## Verificação

- Abrir `/producao/impressao-op` com uma OP de teste, conferir:
  - Header mostra `Rev: -` quando vazio (não mostra "Rev Rev").
  - Header mostra `Derivação:` (com `-` se ausente).
  - Produto e Descrição em linhas separadas, sem código duplicado.
  - Tabela de apontamento tem 7 colunas e 20 linhas em pares (Início/Fim, Refugo).
  - Componentes > 7: imprime operações na 1ª página e componentes em página separada, sem página "vazia" intermediária.
  - Qtde Prev / UN / Dep / Endereço centralizados.
  - Tmp Unit e Tmp Total maiores e em negrito; usam formatado quando vier do backend.
  - Desenhos: quando `url_impressao` vem do backend, não há rotação CSS.

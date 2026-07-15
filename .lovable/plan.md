## Objetivo

Corrigir a visualização da DRE (`DreStudioVisualizacaoPage`) para:

1. Aninhar `7.1`/`7.2` dentro de `7`, `8.1`/`8.2` dentro de `8`, `9.1` dentro de `9` (e qualquer outra sublinha `X.Y` dentro da linha pai `X`).
2. Remover a linha placeholder `__PERSONALIZADO__ / Código personalizado` da tabela.

Ambas alterações são **apenas de exibição** no front, no arquivo `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`. Nada é alterado no backend, nas queries, no cache ou nos hooks.

## Alterações — só em `DreStudioVisualizacaoPage.tsx`

Bloco do `useMemo` que hoje separa `especiais/normais` e reconcilia virtuais do Balanço (linhas ~540-576):

### 1. Filtrar linha personalizada placeholder
Ao classificar `linhasApi` em `especiais*/normais`, descartar toda linha cujo `codigo` normalizado (`String(l.codigo).trim().toUpperCase()`) seja `__PERSONALIZADO__` OU cuja `descricao` normalizada seja `Código personalizado`. Ela não entra em nenhuma das listas — desaparece da grade, do export e do total.

### 2. Reconciliar hierarquia por código também para DRE
Após o bloco `if (vincular)` (linhas 557-576), adicionar um bloco simétrico para **DRE** (`tipoModelo === "DRE"`, ou simplesmente "quando não há `vincular`"):

- Mapear `byCodigo` só com os `normais` cujo `codigo` bate o padrão `^\d+(\.\d+)*$` (evita colidir com `VINCULAR.*` do balanço).
- Para cada linha `l` com `codigo` do tipo `X.Y` (contém `.`) e `linha_pai_id` ausente ou inválido, derivar `codPai = codigo.slice(0, codigo.lastIndexOf("."))` e, se existir uma linha com esse código no mapa, atribuir `l.linha_pai_id = pai.linha_id`.
- Não alterar `ordem`, `nivel`, `codigo`, nem nada mais da linha — só o vínculo pai.

O restante do pipeline (`filhosPorPai`, `sortSiblings`, `visit`) já lida corretamente com o resultado: 7.1 e 7.2 aparecerão indentadas sob 7 e serão colapsáveis pelo controle de nível existente.

## Fora de escopo

- Backend `/api/contabil/modelos/criar-padrao` e `/estrutura-padrao` (a hierarquia correta idealmente virá de lá; por enquanto reconciliamos no front).
- Página de edição da estrutura, `LinhaDialog`, criação de linhas.
- Balanço, DRE Studio de outros modelos, drill, exports.
- Cálculos, totalizadores, sinais.

## Verificação

Após o build automático, abrir `/contabilidade/dre-studio/{id}/visualizacao` e conferir que:
- 7.1 e 7.2 estão indentadas sob 7 (com chevron de expansão em 7).
- 8.1 e 8.2 estão indentadas sob 8.
- 9.1 está indentada sob 9.
- A linha `__PERSONALIZADO__ / Código personalizado` sumiu.
- Nenhum valor mensal muda (a linha placeholder já estava zerada; o aninhamento não altera soma).

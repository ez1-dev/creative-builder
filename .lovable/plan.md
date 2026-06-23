## Objetivo

Aplicar na tela `/bi/financeiro/dre-configuravel` (`DreConfiguravelPainelPage`) o mesmo CRUD de modelo/linha que foi adicionado ao Montador, reaproveitando os contratos FastAPI `/api/dre/modelos` e `/api/dre/linhas` e os diálogos já criados.

## Mudanças

### `src/pages/bi/financeiro/DreConfiguravelPainelPage.tsx`

- Trocar a fonte do `Select` de modelos:
  - Hoje: `fetchDreModelos` (que chama `/api/dre/modelos` em formato livre).
  - Novo: `listarModelosFastApi()` (de `src/lib/bi/dreMontadorModelosApi.ts`), garantindo shape canônico `{ id, nome, padrao }`. Atualizar tipo `DreModeloOpcao` localmente para aceitar `padrao?: boolean` se necessário.
- Trocar a resolução de `codigo_linha → linha_id`:
  - Hoje: `listarLinhas(modeloId)` consulta Cloud `bi_dre_estrutura_v2`.
  - Novo: `listarLinhasFastApi(modeloId)` (FastAPI). Mantém `Map<codigo_linha, id>` igual.
- No header da página, ao lado do título, adicionar barra de ações:
  - **Novo modelo** / **Editar modelo** → abrem `ModeloFormDialog`.
  - **Nova linha** / botões por linha (Editar/Excluir) → reutilizar `LinhaFormDialog` + `desativarLinha`.
- Como as linhas hoje vêm renderizadas pelo `DreDinamicaTable` (baseado em `dreDinamicaApi`), os botões de Editar/Excluir por linha aparecem dentro da própria tabela. Para não mexer no componente compartilhado, adicionar prop opcional `onEditarLinha?(codigo_linha)` e `onExcluirLinha?(codigo_linha)` em `DreDinamicaTable`, renderizando uma coluna extra "Ações" apenas quando recebidas. A página resolve o `id` via `linhasMap` antes de abrir o diálogo ou chamar `desativarLinha`.
- Manter a frase de rodapé do cabeçalho ("Valores apurados via …"). Ajustar apenas para refletir o novo fluxo: "Modelo e linhas mantidos via /api/dre/modelos e /api/dre/linhas; valores apurados via /api/bi/contabilidade/dre-dinamica".
- Após salvar/excluir modelo ou linha: invalidar `['dre-configuravel','modelos']`, `['dre-configuravel','estrutura', modeloId]` e `['dre-dinamica']`.

### `src/components/bi/financeiro/DreDinamicaTable.tsx`

- Adicionar props opcionais `onEditarLinha`, `onExcluirLinha` (recebem o `DreDinamicaLinha`). Quando ao menos uma delas estiver definida, renderizar coluna "Ações" com os botões correspondentes; quando ambas indefinidas, layout fica inalterado (preserva uso em outras telas, se houver).

### Itens fora do escopo

- Não tocar no Montador (já implementado).
- Não alterar `dreConfiguravelApi.ts`, `dreConfigApi.ts`, nem rotas.
- Sem mudanças no backend, migrations ou estilos globais.

## Arquivos

| Tipo | Caminho |
|---|---|
| edit | `src/pages/bi/financeiro/DreConfiguravelPainelPage.tsx` |
| edit | `src/components/bi/financeiro/DreDinamicaTable.tsx` |

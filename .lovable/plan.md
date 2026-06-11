# Impressão de OP — Visualizar selecionadas em lotes

## Objetivo

Eliminar o erro "Failed to fetch" e a lentidão quando o usuário seleciona muitas OPs (ex.: 244), introduzindo um fluxo controlado em lotes de **30 OPs**, com renderização paginada e separação clara entre visualizar e gerar PDF.

## Comportamento novo

1. **Seleção ≤ 30 OPs** → botão **"Visualizar selecionadas"** funciona como hoje (carrega tudo e renderiza).
2. **Seleção > 30 OPs** → ao clicar em "Visualizar selecionadas", abrir um **diálogo de confirmação** (não dispara fetch imediato) com a mensagem:
   > "Você selecionou N OPs. Para melhor desempenho, visualize em lotes ou gere o PDF completo."
   
   E três ações:
   - **Visualizar primeiras 30** — carrega só as 30 primeiras da seleção.
   - **Processar em lotes de 30** — habilita modo paginado (ver item 3).
   - **Gerar PDF completo** — dispara fluxo dedicado de exportação (item 4).

3. **Modo paginado em tela** (lotes de 30):
   - Estado novo `batchMode = { ativo, paginaAtual, totalPaginas, alvos[] }`.
   - Carrega só o lote da página atual (concorrência 6, como hoje).
   - Barra de navegação acima do preview: `← Anterior | Lote X de Y (OPs n–m de N) | Próximo →` + botão **"Imprimir este lote"**.
   - `OpPrintBatch` recebe somente as 30 OPs do lote atual — DOM permanece leve.
   - Loading indica apenas o lote em carregamento, não a tela inteira.
   - Lazy de imagens/desenhos: já existe via `useAuthedBlobUrls`/`useDesenhosA4`; manter, apenas garantir que o hook só dispare para o lote montado.

4. **"Gerar PDF completo"** (botão separado, também na toolbar principal quando há seleção):
   - Chama o endpoint de lote dedicado, fora da árvore de preview, e abre uma janela de impressão isolada (rota interna `/producao/impressao-op/pdf` montada off-screen ou via `window.open` com print automático) **OU** dispara download direto se backend retornar PDF binário.
   - Não monta as N OPs na tela atual.

5. **Toolbar do grid** passa a mostrar:
   - `Visualizar selecionadas` (com badge da quantidade)
   - `Gerar PDF completo` (novo)
   - `Imprimir visualização` / `Limpar seleção` / `Imprimir todas` (mantidos)

## Detalhes técnicos (frontend)

Arquivos a alterar:

- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
  - Constante `LIMITE_PREVIEW_DIRETO = 30`.
  - Refatorar `visualizarSelecionadas()` para:
    - Se `alvos.length <= 30` → fluxo atual.
    - Caso contrário → abrir `Dialog` (shadcn) com as 3 ações.
  - Nova função `carregarLote(alvos, pagina)` que reaproveita o loop de concorrência 6 já existente, mas restrito ao slice da página.
  - Novos estados: `confirmOpen`, `batchMode`, `batchLoading`.
  - Novo componente inline `BatchPager` (navegação entre lotes).
  - Novo handler `gerarPdfCompleto()`.

- `src/lib/producao/opImpressaoLote.ts`
  - Adicionar `fetchImpressaoLotePost(body)` chamando **POST** `/api/producao/ordem-producao/impressao/lote` com o payload solicitado:
    ```json
    {
      "ops": [{ "codemp": 1, "codori": "240", "numorp": 10171 }],
      "incluir_componentes": true,
      "incluir_operacoes": true,
      "incluir_desenhos": true,
      "modo": "preview"
    }
    ```
  - Manter o GET atual como fallback para os fluxos existentes ("Imprimir todas" por origem/pedido).
  - Usar o novo POST tanto para "Visualizar primeiras 30" quanto para cada página do modo paginado (reduz N requisições por lote para 1).

- Novo doc `docs/backend-impressao-op-lote-post.md` descrevendo o contrato POST + modo `pdf` para "Gerar PDF completo" (resposta `application/pdf` ou JSON com URL).

## Dependência de backend

O endpoint **POST** `/api/producao/ordem-producao/impressao/lote` ainda não existe (hoje só há GET por origem/pedido). O frontend será preparado com fallback: enquanto o POST não estiver disponível, "Visualizar primeiras 30" e "Processar em lotes" usam o loop atual de N chamadas GET unitárias (já com concorrência 6 e agora limitado a 30 por vez — o que sozinho já resolve o "Failed to fetch"). Ao subir o POST no FastAPI, basta trocar a função chamada.

Para "Gerar PDF completo", o backend precisa expor um endpoint de exportação binária (ex.: `POST /api/producao/ordem-producao/impressao/lote/pdf`). Enquanto não existir, o botão dispara o mesmo fluxo de lotes encadeados + `window.print()` em janela dedicada.

## Fora de escopo

- Alterar layout/estilo de `OpPrintSheet`.
- Mudar o fluxo de "Imprimir todas" por origem (já usa lote GET).
- Implementar o endpoint backend (documentado, não codificado aqui).

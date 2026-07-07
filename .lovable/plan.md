## Objetivo

Tratar visualmente falhas do endpoint `GET /api/producao/ordem-producao/desenho/impressao-a4/pagina` sem quebrar a tela. Nada de mudar URL, montar caminho para o JPG, nem alterar layout/fluxo.

## Mudanças

### 1) `src/lib/producao/opDesenhosA4.ts`
- Em `carregarPaginaDesenhoA4`, ao receber resposta não-ok, lançar erro estruturado com o `status` HTTP (ex.: `const err = new Error(msg); (err as any).status = response.status; throw err;`) em vez de só string.
- Em `prepararDesenhosParaImpressao`, capturar `e.status` e mapear para mensagem amigável antes de empurrar em `errors`:
  - 404 → "Desenho não encontrado."
  - 422 → "Arquivo de desenho inválido ou corrompido."
  - 500/qualquer 5xx → "Falha ao gerar visualização do desenho."
  - Outros → "Não foi possível carregar o desenho."
- Continuar iterando os demais desenhos/páginas normalmente (já é o comportamento; só garantir que uma falha não aborte o lote).

### 2) `src/components/producao/OpPrintSheet.tsx`
- Renderizar página do desenho A4 mesmo quando o carregamento falhou: quando um desenho estiver em `errors` (nova prop `errosDesenhosA4?: OpDesenhoErro[]`), mostrar um card/preview individual com a mensagem amigável, sem quebrar as demais páginas nem a impressão.
- Manter a página branca "Desenho não encontrado para esta OP" só para o caso atual (sem nenhum desenho retornado pela API).

### 3) `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Passar `errors` do `useDesenhosA4` para o `OpPrintSheet` via nova prop.
- No banner/aviso da tela (já existente para desenhos A4), substituir a mensagem genérica atual pela mesma lógica de mapeamento por status quando houver `errors`, listando por desenho (nome_arquivo + mensagem amigável). Não trocar layout.

## Fora do escopo
- URL do endpoint, headers, autenticação, montagem de caminho JPG.
- `useAuthedBlobUrl`, fluxo de PDF, backend, `.env`, config de API.
- Layout, filtros, opções de impressão.

## Validação
1. Forçar 404 em uma página → aparece "Desenho não encontrado." só no card daquele desenho; demais imprimem normalmente.
2. Forçar 422 → "Arquivo de desenho inválido ou corrompido." no card.
3. Forçar 500 → "Falha ao gerar visualização do desenho." no card.
4. Fluxo feliz continua idêntico.

## Objetivo
Corrigir a impressão da Ordem de Produção no modo **Quebrar uma página por operação / centro de recurso** para que cada sequência gere o ciclo correto `operação → desenho` (ou página branca técnica), sem deixar um desenho solto apenas no final.

## O que vou ajustar

### 1) `src/components/producao/OpPrintSheet.tsx`
Reestruturar o bloco `if (quebrarPorOperacao)` para montar explicitamente a lista de páginas em ordem de impressão.

- Criar um fluxo por sequência usando um array `paginas: React.ReactNode[]`
- Para cada operação:
  - adicionar a página da operação
  - adicionar logo em seguida o desenho correspondente
  - se não houver desenho e a opção estiver marcada, adicionar a `MissingDrawingPage`
- Manter a regra atual de componentes:
  - componentes inline apenas na primeira operação quando cabem
  - componentes paginados apenas uma vez, após a primeira operação, sem repetir em todas as sequências
- Corrigir o caso `operacoes.length === 0` para também usar a mesma lógica de reserva de desenho quando aplicável

### 2) Funções auxiliares de desenho no mesmo arquivo
Padronizar helpers para evitar duplicação e conflito de chaves React.

- Criar/ajustar `renderDesenhosOuReserva(keyPrefix)` para centralizar a regra:
  - se desenhos não devem ser impressos, retorna `null`
  - se houver páginas A4 ou desenhos disponíveis, retorna `renderDesenhos(keyPrefix)`
  - se não houver desenho, retorna `MissingDrawingPage`
- Ajustar `renderDesenhos(keyPrefix)` para gerar chaves realmente únicas por operação e por página
- Preservar compatibilidade futura com um possível `desenhos_por_operacao`, deixando o ponto de extensão claro dentro do loop por operação

### 3) `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
Padronizar a espera de carregamento visual antes do `window.print()`.

- Reaproveitar a função já existente de espera dos desenhos
- Garantir que todos os gatilhos de impressão usem essa espera, incluindo:
  - impressão individual
  - gerar PDF
  - imprimir da visualização
  - imprimir a partir da linha da grade
  - impressão em lote
- Substituir o `setTimeout(() => window.print(), 200)` do fluxo da grade por um fluxo assíncrono consistente

## Resultado esperado
Para uma OP com sequências 10, 20, 30 e 50, a ordem deve ficar:

```text
Seq. 10
Desenho

Seq. 20
Desenho

Seq. 30
Desenho

Seq. 50
Desenho
```

Se não houver desenho:

```text
Seq. 10
Página branca técnica

Seq. 20
Página branca técnica
```

## Detalhes técnicos
- O código atual já intercalou parcialmente, mas ainda mantém a estrutura de retorno baseada em `map`, o que dificulta controlar com precisão a ordem completa das páginas e os blocos complementares.
- O helper `renderDesenhosOuReserva` citado na proposta do usuário ainda não existe no arquivo atual; eu vou adicioná-lo usando a estrutura real do componente.
- A função de espera antes da impressão já existe (`aguardarDesenhosProntos`), mas ainda não é usada em todos os caminhos de impressão.
- Não haverá mudança de backend, contrato de API, CSS de impressão ou outros modos de layout fora do necessário para esse fluxo.
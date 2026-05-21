## Diagnóstico

Auditei `OpPrintSheet.tsx`, `op-print.css` e `opImpressao.ts` contra os 10 pontos do checklist. **Pontos 2–8 já estão implementados** (Rev/Derivação, produto+descrição sem duplicação, `url_impressao || url`, tabela de apontamento 10×2, centralização das colunas de componentes, `tmp_*_formatado`, `@page A4 portrait` 196mm). Sobram **três correções reais** no frontend.

## Correções

### 1) Respeitar flags do payload `modo_impressao` / `layout_componentes`

Hoje `OpPrintSheet` recebe `quebrarPorOperacao` **só por prop** e ignora o que a API entrega. Também usa `> 7` hardcoded como gatilho de quebra de componentes.

Ajustes em `src/lib/producao/opImpressao.ts`:

```ts
modo_impressao?: {
  imprimir_observacoes?: boolean;
  quebrar_por_operacao?: boolean;
  desenhos_apos_op?: boolean;
  desenhos_um_por_pagina?: boolean;
  a4?: boolean;
};
layout_componentes?: {
  quebrar_componentes_em_pagina_separada?: boolean;
  limite_componentes_primeira_pagina?: number;
  posicao_componentes_quando_quebrar?: 'APOS_OPERACOES' | 'ANTES_OPERACOES';
};
```

Ajustes em `OpPrintSheet.tsx`:

```ts
const quebrarPorOperacao =
  propQuebrarPorOperacao ?? data?.modo_impressao?.quebrar_por_operacao ?? false;

const limiteComp =
  data?.layout_componentes?.limite_componentes_primeira_pagina ?? 7;

const quebrarComponentes =
  data?.layout_componentes?.quebrar_componentes_em_pagina_separada
  ?? (componentes.length > limiteComp);
```

(prop continua tendo prioridade para não quebrar a tela que já escolhe quebra manualmente).

### 2) Desenhos no fim, **uma vez só**, quando `quebrar_por_operacao`

Hoje no branch `quebrarPorOperacao` o código renderiza `renderDesenhos('drw-op${i}')` **dentro do loop de operações**, o que duplica os desenhos N vezes. Corrigir para a ordem prevista no contrato:

```
operações (1 por página) → componentes (se > limite) → desenhos (1 por página, ao final)
```

Implementação:

```tsx
return (
  <>
    {operacoes.map((op, i) => (
      <div key={`opp-${i}`} className="op-sheet op-operation-page ...">
        {renderHeader()}
        {!quebrarComponentes && renderComponentes()}
        <div className="op-section-title">Operação</div>
        {renderOperacao(op, i)}
        {renderFooter()}
      </div>
    ))}
    {quebrarComponentes && renderComponentesPage()}
    {desenhos.length > 0 && renderDesenhos('drw-end')}
    {renderPreviewDesenhosResumo()}
  </>
);
```

### 3) Remover do código o helper morto `renderIndicacaoComponentesSeparados`

A função existe mas nunca é chamada — o usuário também não quer mais o aviso "Componentes impressos em página separada". Limpar para evitar confusão futura.

## Fora de escopo

- Backend / rota `/desenho/impressao-a4` (já documentada).
- Mudanças no cabeçalho, apontamento, tempos, centralização de componentes (já OK).
- Comportamento atual da prop `quebrarPorOperacao` na tela `ImpressaoOrdemProducaoPage` permanece (prop manda no payload).

## Critérios de aceite

- Ligando `quebrar_por_operacao=true` pelo payload (sem prop), a tela quebra por operação automaticamente.
- Com 10 operações e 3 desenhos no modo quebra-por-operação, a impressão tem 10 páginas de operação + 1 bloco de desenhos no fim (3 páginas), **não** 30 desenhos repetidos.
- `limite_componentes_primeira_pagina` do payload sobrescreve o 7 fixo.
- Modo padrão (sem quebra por operação) continua igual.

## Arquivos a tocar

- `src/lib/producao/opImpressao.ts` — ampliar tipos.
- `src/components/producao/OpPrintSheet.tsx` — leitura das flags + reordenar desenhos + remover helper morto.

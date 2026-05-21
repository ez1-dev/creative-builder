# Correção pontual no front da Impressão de OP

## Contexto

Revisão dos 10 pontos solicitados. **9 já estão implementados** corretamente em `OpPrintSheet.tsx` / `op-print.css` / `opImpressao.ts`:

- Revisão sem "REV REV" (filtro do literal `"REV"`)
- Derivação exibida
- Produto sem código duplicado (regex remove prefixo)
- Desenhos usando `url_impressao || url`, sem rotate quando há `url_impressao`, 1 por página A4
- Apontamento 10×2 (Início/Fim + Refugo) com as 7 colunas exatas
- Componentes com QTD Prev./UN/Dep./Endereço centralizados
- Tempos usando `tmp_unit_formatado` / `tmp_total_formatado` em fonte maior e bold
- `@page A4 portrait`, 196mm útil, sem `transform: scale` nem `zoom`
- Tipos do payload (`modo_impressao.*`, `layout_componentes.*`) já mapeados

## Problema remanescente (ponto 1)

No modo `quebrar_por_operacao = true`, quando `componentes ≤ 7`, a tabela de componentes está sendo renderizada **dentro de cada página de operação**:

```text
src/components/producao/OpPrintSheet.tsx (linha 407)
  {!quebrarComponentes && renderComponentes()}
```

Isso faz a lista de componentes aparecer repetida N vezes (uma por operação), e contraria o requisito: nesse modo, componentes só devem aparecer **após as operações** e **somente se > 7**, como página separada.

## Mudança proposta

Em `src/components/producao/OpPrintSheet.tsx`, dentro do bloco `if (quebrarPorOperacao)`:

- Remover a linha `{!quebrarComponentes && renderComponentes()}` de dentro do `operacoes.map(...)`.
- Manter o fluxo final exatamente: operações (1 por página) → `quebrarComponentes && renderComponentesPage()` → desenhos → preview resumo.

Fluxo resultante quando `quebrar_por_operacao = true`:

```text
Operação 1 (página A4)
Operação 2 (página A4)
...
Operação N (página A4)
[Componentes em página separada — só se > 7]
Desenho 1 (A4)
Desenho 2 (A4)
```

Nenhuma outra mudança é necessária. Modo padrão (`quebrar_por_operacao = false`) permanece intacto.

## Arquivos tocados

- `src/components/producao/OpPrintSheet.tsx` — 1 linha removida

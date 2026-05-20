## Objetivo

Na impressão de OP (`OpPrintSheet`), substituir as duas tabelas de apontamento (`op-apontamento-old` 6 colunas + `op-apontamento-table` 9 colunas) por **uma única estrutura de apontamento**, com os campos das duas tabelas unidos, quebrada em **4 linhas por entrada**, separadas por **espaço + linha pontilhada fina**, e **replicada dinamicamente** até preencher o espaço útil da página.

## Campos (união das duas tabelas, sem duplicar)

Início, Fim, Tempo Setup, Qtd Produzida, Refugo, Motivo Desvio, Operador, Check, OBS.

## Layout de cada entrada (4 linhas)

Cada entrada é um bloco com 4 linhas de células com borda, no padrão "rótulo em cima / espaço para preenchimento manual embaixo":

```
┌────────────┬────────────┬───────────────┐
│ Início     │ Fim        │ Tempo Setup   │   ← L1
├────────────┼────────────┼───────────────┤
│ QTD Prod.  │ Refugo     │ Operador      │   ← L2
├────────────┴────────────┴───────────────┤
│ Motivo Desvio                            │   ← L3
├──────────────────────────────────┬──────┤
│ OBS                              │ ☐    │   ← L4 (Check à direita)
└──────────────────────────────────┴──────┘
```

Cada célula = rótulo pequeno no topo + área em branco abaixo (altura ~7mm) para preenchimento manual, mesma estética das tabelas atuais (borda 0.5pt preta, fundo branco).

## Separador entre entradas

Entre uma entrada e a próxima:
- ~3mm de espaço vazio
- 1 linha tracejada fina horizontal (`border-top: 1px dashed #000`)
- mais ~3mm de espaço

## Replicação dinâmica

Renderizar quantas entradas couberem no espaço restante da folha A4 (após cabeçalho, dados da operação e narrativas). Implementação:

1. Envolver o bloco em um container `.op-apontamento-fill` com `ref`.
2. `useLayoutEffect` mede a altura disponível (altura da página menos o que já foi renderizado acima dentro do `.op-operation`).
3. Divide pela altura conhecida de 1 entrada + separador (constante baseada em mm) e renderiza `N` blocos.
4. Fallback: se medição falhar, usar `N = 6` (valor seguro para A4 retrato com cabeçalho típico).

## Arquivos a alterar

**`src/components/producao/OpPrintSheet.tsx`**
- Remover os dois `<table>` (`op-apontamento-old` e `op-apontamento-table`) dentro de `renderOperacao`.
- Substituir por novo componente interno `<ApontamentoFill operacaoIndex={i} />` que renderiza N entradas (cada uma com as 4 linhas) + separadores tracejados.
- Adicionar `useLayoutEffect`/`useState` para calcular N.

**`src/components/producao/op-print.css`**
- Novas classes:
  - `.op-apontamento-fill` — container flex-column, `flex: 1`.
  - `.op-apt-entry` — grid de 4 linhas com bordas.
  - `.op-apt-row` — linha do grid (variações `--3col`, `--full`, `--obs-check`).
  - `.op-apt-cell` — célula com `label` em cima + área em branco (~7mm).
  - `.op-apt-sep` — separador (`margin: 3mm 0; border-top: 1px dashed #000;`).
- Remover/zerar regras antigas `.op-apontamento-old`, `.op-apontamento-table`, `.op-apontamento-row`, `.op-apontamento-cell-check`, `.check-cell`, `.check-box` que ficarão sem uso (manter apenas se houver referência externa — verificar com `rg`).
- Garantir consistência em `@media print` (bordas em pt, sem sombra, altura preservada).

## Fora do escopo

- Outras tabelas (componentes, cabeçalho, desenhos).
- Modo "quebrar por operação" usa o mesmo `renderOperacao`, então herda a mudança automaticamente.
- Backend / payload da API — sem alteração.

## Validação

1. Preview em `/producao/impressao-op` com 1 operação: deve mostrar 1 bloco de apontamento por operação com N entradas preenchendo até o fim da página.
2. Imprimir / "Salvar como PDF" e conferir que cada entrada tem 4 linhas, separadas por linha pontilhada, sem overflow para nova página.
3. Testar com `quebrar_por_operacao=S` (1 OP por página) — N maior, pois mais espaço sobra.

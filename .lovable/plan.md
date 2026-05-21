## Objetivo
Na ficha de impressão da OP (`OpPrintSheet`), substituir a tabela antiga de apontamento manual pela nova estrutura mostrada na referência, com linhas de **12 mm** de altura, preenchendo o espaço restante da página.

## Nova estrutura (por bloco de apontamento)
Cada apontamento ocupa **4 linhas** de 12 mm (= 48 mm):

```text
┌────────┬──────┬─────────────┬─────┬──────┬───────────────┬────────┐
│ inicio │ data │ tempo setup │ fim │ data │ qtd produzida │ refugo │   ← cabeçalho (12mm)
├────────┼──────┼─────────────┼─────┼──────┼───────────────┼────────┤
│        │      │             │     │      │               │        │   ← preenchimento (12mm)
├────────┴──────┴─────┬───────┴─────┴──────┼───────────────┼────────┤
│  motivo do desvio   │        obs         │   operador    │ check  │   ← cabeçalho (12mm)
├─────────────────────┼────────────────────┼───────────────┼────────┤
│                     │                    │               │        │   ← preenchimento (12mm)
└─────────────────────┴────────────────────┴───────────────┴────────┘
```

Cabeçalhos com fundo cinza claro (igual aos demais cabeçalhos da ficha), texto minúsculo, bordas pretas finas como na referência.

## Alterações

**`src/components/producao/OpPrintSheet.tsx`** (linhas 256–290)
- Remover a tabela atual de apontamento (7 colunas × 20 linhas).
- Renderizar a nova estrutura como `<table class="op-apontamento-table">` com N blocos (4 `<tr>` cada). Cada bloco:
  - tr cabeçalho-1: th inicio / data / tempo setup / fim / data / qtd produzida / refugo
  - tr dados-1: 7 td vazios
  - tr cabeçalho-2: th motivo do desvio (colSpan 3) / obs (colSpan 2) / operador / check
  - tr dados-2: 4 td vazios (mesmos colSpans)
- N (qtd de blocos) calculado para caber: padrão **3 blocos** quando há narrativa/lista de componentes na página, e até o limite que couber no espaço restante. Implementação simples: usar `flex: 1` no wrapper da tabela + classe utilitária que repete blocos até preencher (renderizar quantidade fixa configurável, default 4, definida por constante no topo do componente).

**`src/components/producao/op-print.css`** (bloco "Tabela de apontamento manual", ~linhas 574–650 e regra `@media print` correspondente)
- Reescrever regras:
  - `.op-apontamento-table` ocupa 100% da largura e altura disponível (`height: 100%`, dentro de container flex que cresce até o fim da página).
  - `th, td { height: 12mm; border: 1px solid #000; padding: 0 4px; font-size: 9pt; }`
  - Cabeçalhos (`th`) com `background: #f0f0f0`, alinhamento à esquerda, peso normal/pequeno como na referência.
  - Larguras de coluna calibradas para os 7 campos da linha superior; linha inferior usa colSpans.
  - Última linha de cada bloco com borda inferior mais grossa (`border-bottom: 2px solid #000`) para separar apontamentos.
- Manter regras `@media print` espelhando alturas em mm e cores em preto puro.

## Não alterar
- Cabeçalho da OP, código de barras, dados de produto/componentes, narrativas, observações de responsabilidade, rodapé.
- Lógica de quebra por operação, desenhos A4, carregamento de blobs.
- Demais arquivos.

## Critérios de aceite
- Cada linha do bloco de apontamento mede 12 mm na impressão.
- Cabeçalhos exatamente: `inicio | data | tempo setup | fim | data | qtd produzida | refugo` e `motivo do desvio | obs | operador | check`.
- A tabela ocupa o espaço restante da página (sem sobrar grande área branca abaixo, sem estourar para nova página).
- A separação visual entre apontamentos (linha mais grossa) fica clara como na referência.

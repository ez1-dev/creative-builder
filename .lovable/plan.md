## Objetivo
Corrigir a ordem das páginas em `OpPrintSheet` quando "Quebrar uma página por operação / centro de recurso" está marcado: hoje, se houver mais de 7 componentes, é gerada uma primeira página vazia só com o aviso "Componentes impressos em página separada". Essa página não deve existir nesse modo.

## Mudança única
Arquivo: `src/components/producao/OpPrintSheet.tsx`, bloco `if (quebrarPorOperacao)` (linhas ~357–396).

### Antes
```text
[capa OP + aviso "Componentes impressos em página separada"]   <- remover
[página componentes]                                            <- mover para o fim
para cada operação:
  [cabeçalho + operação + rodapé]
  [desenhos]
```

### Depois
```text
para cada operação:
  [cabeçalho + operação + rodapé]
  [desenhos da OP, se houver]      (mantém comportamento atual)
[página componentes, se quebrarComponentes]
[resumo de desenhos no preview]
```

### Detalhes
- Remover o bloco que renderiza `op-sheet` + `renderIndicacaoComponentesSeparados()` + `renderFooter()` no início.
- Mover `quebrarComponentes && renderComponentesPage()` para depois do `operacoes.map(...)`.
- Dentro de cada página de operação: manter `!quebrarComponentes && renderComponentes()` (quando há ≤7 componentes, continuam embutidos na página da operação, como hoje).
- O caso `operacoes.length === 0` em modo `quebrarPorOperacao` continua exibindo "Nenhuma operação encontrada..." (já existe).
- A mensagem `renderIndicacaoComponentesSeparados()` só será usada no modo padrão (`!quebrarPorOperacao`), exatamente como pede a regra 9.

## Fora de escopo
- Modo padrão (`!quebrarPorOperacao`) — não muda.
- Lógica de desenhos, rotação, `url_impressao`, `OpPrintBatch`, CSS de impressão.
- Backend / endpoint de PDF.

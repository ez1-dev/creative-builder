## Diagnóstico confirmado

`src/components/producao/OpPrintSheet.tsx` linha **429**, dentro do bloco `if (quebrarPorOperacao)`:

```tsx
{quebrarComponentes && renderComponentesPage()}
```

`quebrarComponentes` só é `true` quando `componentes.length > limiteComp` (limite = 7). Em modo "quebrar por operação", se a OP tem ≤ 7 componentes (caso da OP 125), a página de componentes **nunca é renderizada** — nem nas operações (já removida antes para evitar duplicação), nem ao final. Por isso a OP 125 sai sem a "Relação de Componentes Necessários".

A OP 140/30 tem > 7 componentes, então cai no `true` e a página é gerada.

## Correção

Trocar a condição para renderizar a página de componentes **sempre que houver componentes**, no modo quebra por operação. `renderComponentesPage()` já lida internamente com `componentes.length === 0`, mas mantemos a guarda explícita por clareza.

### Alteração única

**`src/components/producao/OpPrintSheet.tsx` — linha 429**

Trocar:
```tsx
{quebrarComponentes && renderComponentesPage()}
```

Por:
```tsx
{componentes.length > 0 && renderComponentesPage()}
```

`renderComponentesPage()` já cria UMA página A4 com cabeçalho + tabela de componentes agrupados por estágio. Cabe naturalmente em uma página para OPs pequenas; para OPs grandes a tabela quebra via CSS de impressão. Mantém o comportamento atual de OPs com muitos componentes (140/30) e passa a contemplar as pequenas (125).

## Escopo

- Apenas 1 linha em `OpPrintSheet.tsx`.
- Não altera modo padrão (sem quebra por operação).
- Não altera API, busca individual, lógica de desenhos, cabeçalho ou apontamento.

## Validação

1. Imprimir em lote (seleção múltipla) com `quebrar por operação = Sim` incluindo a OP 125.
2. Após as páginas de operação da OP 125, deve aparecer uma página com "Relação de Componentes Necessários" listando os 5 componentes (Estágio 2000).
3. Para a OP 140/30 (>7 componentes), comportamento permanece igual.

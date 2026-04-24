## Registrar valores oficiais Genius (Jan–Abr/2026) como referência de validação

### 1. Memória do projeto
Criar `mem://features/faturamento-genius-targets` com a tabela de valores esperados (Jan/Fev/Mar/Abr 2026) para a revenda GENIUS, incluindo as fórmulas implícitas (Fat. Líq. = Fat. − Dev. − |Impostos| − Desconto, % Rep = Fat./Total, etc.). Atualizar `mem://index.md` adicionando o item na lista Memories.

### 2. Painel de validação na tela `/faturamento-genius`
Adicionar (oculto por padrão, atrás de um Switch "Modo validação Genius") um quadro comparativo que mostra, para cada mês carregado:

```text
| Mês | Esperado | Retornado API | Δ | OK? |
```

Comparando os 11 campos por mês contra a tabela de referência. Verde se diferença ≤ R$ 1 / 1 unidade, amarelo se ≤ 1%, vermelho se maior. Permite ver imediatamente quais campos do backend ainda estão divergentes (hoje sabemos que `valor_devolucao` vem 0 e `valor_custo` vem distorcido).

Filtro automaticamente fixa `revenda = 'GENIUS'` quando o modo validação está ligado.

### 3. Sem mudanças de backend
Nada no FastAPI. Esse plano só:
- documenta os números de referência (memória)
- adiciona painel de QA visual no frontend para comparar API × esperado

### Arquivos afetados
- `mem://features/faturamento-genius-targets` (novo)
- `mem://index.md` (atualizado)
- `src/pages/FaturamentoGeniusPage.tsx` (novo bloco de validação opcional)

### Garantias
- Endpoints, parâmetros e contrato JSON inalterados
- Modo validação é opt-in (Switch desligado por padrão)
- Não afeta exportação Excel nem outras telas

## Problema

Quando o usuário ativa **"Agrupar Colaborador"** na tabela de Passagens Aéreas, os títulos das colunas continuam: `Data | Colaborador | C. Custo | Tipo | Origem → Destino | Cia | Valor`.

Mas o conteúdo das linhas filhas muda: a coluna "Colaborador" fica vazia (mostra só "↳"), porque o nome já está no cabeçalho do grupo. Isso faz os títulos ficarem **incoerentes** com o que aparece embaixo — exatamente o ponto que você levantou (igual ao exemplo de planilha que mandou, onde os títulos refletem o conteúdo).

## Solução proposta

Quando estiver no modo **agrupado por colaborador**, reorganizar o cabeçalho para que faça sentido com o que está sendo mostrado:

**Modo normal (sem agrupamento) — mantém igual:**
```
Data | Colaborador | C. Custo | Tipo | Origem → Destino | Cia | Valor | Ações
```

**Modo agrupado por colaborador — novo cabeçalho:**
```
Data | C. Custo | Tipo | Origem → Destino | Cia | Valor | Ações
```

Ou seja: removemos a coluna **"Colaborador"** do cabeçalho (já que o nome aparece na linha-pai do grupo) e as linhas filhas ficam alinhadas certinho com os títulos. O "↳" que aparecia hoje some.

A linha-pai (cabeçalho do grupo) continua mostrando: nome do colaborador + badge de quantidade + total à direita, ocupando toda a largura via `colSpan`.

## Detalhes técnicos

Arquivo: `src/components/passagens/PassagensDashboard.tsx` (bloco `<Table>` linhas ~723–802)

1. **Cabeçalho condicional**: renderizar `<TableHead>Colaborador</TableHead>` apenas quando `!agruparColab`.
2. **Linha-pai do grupo**: ajustar `colSpan` de 6 → 5 (já que removemos uma coluna).
3. **Linhas filhas no modo agrupado**: remover a `<TableCell>` com "↳" e remover também a célula de "Data com pl-8" (manter padding normal). A indentação visual pode ser substituída por uma borda lateral suave no `<TableRow>` (`border-l-2 border-muted`) para indicar hierarquia sem precisar de coluna extra.
4. **Ajuste dos `colSpan` de loading / vazio**: hoje usam `colSpan={8}`. Trocar para uma constante calculada (ex.: `const colCount = agruparColab ? 7 : 8` considerando a coluna de Ações).
5. **Mobile (cards)**: já está correto — o card filho não mostra o nome do colaborador porque ele está no cabeçalho do accordion. Sem mudança necessária.
6. **Drawer "Registros agrupados" e exports CSV/Excel**: não mudam — eles mostram tabela resumo (Colaborador, Qtd, Total).

## Resultado

Ao agrupar, o usuário vê uma tabela onde **cada título de coluna corresponde exatamente ao dado abaixo** — coerência total entre cabeçalho e conteúdo, exatamente como no exemplo de planilha que você compartilhou.
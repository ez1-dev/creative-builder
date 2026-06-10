# Permitir duplicar blocos do catálogo BI Comercial

## Problema

No diálogo "Adicionar bloco", todo bloco do catálogo já presente fica `disabled` com `(já adicionado)`. Hoje o sistema usa `widget.type` como identificador único (chave de banco `dashboard_widgets.type`, de render, de hidden-state, de drag/drop, de delete). Por isso o catálogo não permite repetir um bloco.

A solução escolhida ("permitir duplicar qualquer bloco do catálogo") exige separar **identidade da instância** (única por widget na tela) da **identidade do tipo** (qual definição do catálogo é usada para renderizar).

## Estratégia

Introduzir o conceito de **`instanceType`** sem mexer no banco:

- Banco continua salvando o campo `type`, mas pode receber valores como `kpi-faturamento__c-1730xxxx` para instâncias duplicadas.
- Em qualquer lookup contra `COMERCIAL_WIDGETS`, usamos o "tipo base" (parte antes de `__c-`).
- Todas as chaves em memória (`hidden[*]`, `out[*]`, `pendingDeletes`, `layoutDraft`, `presentTypes`) passam a usar `w.type` (já único por instância) — não muda nada nelas, só garante que duplicatas terão `type` diferente.

Assim a refatoração é cirúrgica: tudo que hoje indexa por `w.type` continua válido; só precisamos:

1. Mintar tipos derivados ao adicionar duplicata.
2. Resolver `def` por **tipo base** (não pelo tipo exato) nas poucas chamadas a `COMERCIAL_WIDGETS[w.type]`.
3. Permitir múltiplas linhas com `type` base igual em `mergeWithDefaults` (que hoje dedupa por type).

## Mudanças

### 1. `src/lib/bi/comercialWidgetCatalog.ts`
- Exportar helper `baseWidgetType(type: string): string` → retorna a parte antes de `__c-`.
- Exportar `getWidgetDef(type: string)` → `COMERCIAL_WIDGETS[baseWidgetType(type)]`.

### 2. `src/components/bi/runtime/AddBiWidgetDialog.tsx`
- Remover `disabled={present}` no `<SelectItem>` e o sufixo `(já adicionado)`. Em vez disso mostrar contador `(× N)` quando já existe ≥1 instância para informar o usuário.
- Em `handleAdd`, quando `presentTypes.includes(def.type)` → emitir `type: \`${def.type}__c-${Date.now()}\``. Caso contrário, mantém `def.type` original (preserva blocos do catálogo padrão).
- `firstAvail` inicial continua escolhendo um não-presente, mas se todos estiverem presentes, fica no primeiro mesmo assim.

### 3. `src/hooks/useComercialLayout.ts`
- `mergeWithDefaults`: hoje faz `byType.get(d.type) ?? d` — substituir por lógica que **inclui todas as instâncias salvas** e só usa default quando o tipo base não tem nenhuma instância salva. Pseudo:
  ```ts
  const savedBaseTypes = new Set(rows.map(r => baseWidgetType(r.type)));
  const defaultsFaltando = COMERCIAL_DEFAULT_WIDGETS.filter(d => !savedBaseTypes.has(d.type));
  return [...rows, ...defaultsFaltando].sort(by position);
  ```
- `reuseIdentity`: trocar `prevByType` por map por `type` (já é único por instância) — manter.
- `saveLayout`: `byType` continua válido (cada instância tem type único). Mas o fallback `COMERCIAL_DEFAULT_WIDGETS.find((d) => d.type === item.type)` precisa usar `baseWidgetType(item.type)`.
- `deleteWidget(type)`: já deleta por type exato — funciona.

### 4. `src/pages/bi/ComercialPage.tsx`
- Todas as chamadas a `COMERCIAL_WIDGETS[w.type]` (linhas ~829, ~902 e similares) → trocar por `getWidgetDef(w.type)`.
- Branches especiais `if (w.type === 'resumo-faturamento')` / `'gauge-atingimento')` → comparar `baseWidgetType(w.type)`.
- `presentTypes` continua `widgets.map(w => w.type)` (passa para o diálogo só pra mostrar contador).

### 5. Layout inicial de duplicatas
- Em `handleAddWidget` (ComercialPage) o cálculo de `maxY` já posiciona o novo bloco no final. Mantém.

## Critérios de aceite
- Posso abrir "Adicionar bloco" → catálogo, escolher "Faturamento" mesmo já existindo, e clicar Adicionar.
- Aparece um segundo card "Faturamento" no dashboard, sem sobrescrever o original.
- Cada duplicata pode ser configurada, movida, redimensionada, ocultada e deletada independentemente.
- Recarregar a página preserva ambas (vêm do banco como linhas distintas com `type` distinto).
- "Voltar ao padrão" (reset) volta ao layout inicial sem duplicatas.
- Blocos do catálogo padrão (ex.: `kpi-faturamento`) que nunca foram duplicados continuam usando o `type` simples no banco.

## Fora do escopo
- Não cria UI para "Duplicar bloco" no menu de cada card (pode ser adicionada depois reaproveitando o mesmo mecanismo).
- Não mexe na aba "Da Biblioteca BI" (já permite duplicar via `custom-*`).

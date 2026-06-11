# Toggle de Números só no modo "Editar dashboard"

## Comportamento atual
O `NumberRoundingToggle` da página `/bi/comercial` fica sempre visível no header (para admins) e cada clique persiste imediatamente em `user_preferences.bi_display_prefs.numberRounding.pages['bi-comercial']`. Isso causa dois problemas:

- O usuário pode mudar o modo "por engano" e ele já fica salvo, mesmo sem entrar em edição.
- A escolha não está vinculada ao fluxo "Minha versão / Editar dashboard / Salvar".

## Objetivo
Esconder o toggle fora da edição. Quando o usuário clicar em **Editar dashboard** (que já força entrar em "Minha versão"), o toggle aparece com as 4 opções + **Usar padrão** e funciona como rascunho: só é gravado quando ele clicar em **Salvar**, e descartado no **Cancelar**.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx`
- Remover o `<NumberRoundingToggle pageKey={PAGE_KEY} … />` que fica sempre visível.
- Renderizar o toggle dentro do bloco `editing ? (…)` (junto de "Adicionar bloco / Restaurar / Cancelar / Salvar"), visível só em modo edição.
- Em vez de persistir direto, o toggle dentro do editor passa a operar sobre um estado local `draftRounding` (inicializado com o valor efetivo da página no momento do `handleEnterEdit`).
- `handleCancelEdit`: limpa o draft e restaura o singleton `setNumberRoundingMode` para o valor efetivo anterior.
- `handleSaveDashboard`: além do save atual do layout, chamar `setPageRounding(PAGE_KEY, draftRounding)` (ou `null` se o usuário escolheu "Usar padrão"). Só depois fechar o modo edição.

### 2. `src/components/bi/runtime/NumberRoundingToggle.tsx`
Adicionar um modo "controlado/draft" opcional sem quebrar usos atuais (Biblioteca BI continua persistindo na hora):

```ts
interface Props {
  pageKey?: string;
  className?: string;
  // novo:
  value?: NumberRoundingMode;            // se definido, opera em modo controlado
  onChange?: (m: NumberRoundingMode) => void;
  onResetToGlobal?: () => void;          // chamado pelo botão "Usar padrão"
  showResetButton?: boolean;             // força exibir "Usar padrão" mesmo sem override salvo
}
```

- Quando `value` é fornecido: o `ToggleGroup` usa `value` + `onChange`; não chama `setPageRounding` direto. O botão "Usar padrão" chama `onResetToGlobal`.
- Continua sincronizando o singleton `setNumberRoundingMode(value)` no `useEffect` para que o preview ao vivo dentro da edição reflita imediatamente a escolha.
- Sem `value`: comportamento atual (Biblioteca BI e qualquer outro consumidor).

### 3. ComercialPage — fiação do draft
```tsx
const effective = effectiveRoundingFor(PAGE_KEY);
const [draftRounding, setDraftRounding] = useState<NumberRoundingMode>(effective);

// ao entrar em edição
handleEnterEdit = () => { setDraftRounding(effective); … }

// dentro do JSX, só quando editing:
<NumberRoundingToggle
  value={draftRounding}
  onChange={setDraftRounding}
  onResetToGlobal={() => setDraftRounding(prefs.numberRounding.global)}
  showResetButton
/>

// ao salvar
await saveLayout(...);
const isDefault = draftRounding === prefs.numberRounding.global;
await setPageRounding(PAGE_KEY, isDefault ? null : draftRounding);

// ao cancelar
setNumberRoundingMode(effective); // restaura preview
```

## Fora de escopo
- Biblioteca BI (continua salvando na hora o padrão global).
- Faturamento Genius e outras páginas BI (não têm modo Editar dashboard).
- Persistir o modo dentro do JSON do layout pessoal (continua em `user_preferences.bi_display_prefs.pages[PAGE_KEY]`, que já é por usuário e por página — atende ao requisito de ficar atrelado à "Minha versão" daquele usuário).

## Validação
1. Entrar em `/bi/comercial` como admin sem clicar em Editar: toggle não aparece.
2. Clicar **Editar dashboard** → aparecem `Completo / Sem decimais / Abreviado / Milhões (MI) / Usar padrão`.
3. Mudar para "Sem decimais": KPIs/tabelas atualizam ao vivo.
4. **Cancelar**: volta ao modo anterior, nada persistido (recarregar a página confirma).
5. **Salvar**: persiste; logout/login mantém "Sem decimais" na própria conta.
6. "Usar padrão" + Salvar: remove o override da página (volta ao global).

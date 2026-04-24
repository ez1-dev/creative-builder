

## Busca incremental de fornecedor com filtro em tempo real

### Comportamento desejado
Ao clicar no campo "Fornecedor" no Painel de Compras e digitar (ex.: "MET"), a lista do dropdown já filtra mostrando só fornecedores que contêm esse texto, em tempo real, sem precisar apertar Enter.

### Situação atual
O `ComboboxFilter` já faz exatamente isso — tem `CommandInput` interno que filtra `options` localmente conforme o usuário digita (`o.label.toLowerCase().includes(inputValue.toLowerCase())`).

**Porém** existe um efeito colateral: cada tecla digitada no combobox chama `onChange`, que atualiza `filters.fornecedor`. No Painel de Compras isso não dispara busca no backend (só ao clicar Pesquisar), então o comportamento já está OK funcionalmente.

O que provavelmente não está claro hoje:
1. A lista pode estar vazia até a primeira pesquisa (se `useFornecedores` depender de `erpReady` e o endpoint `/api/fornecedores` ainda não existir no backend).
2. Limite de 50 itens visíveis no dropdown pode esconder resultados quando a base é grande e o usuário ainda não digitou nada.

### O que muda

**`src/components/erp/ComboboxFilter.tsx`**
- Abrir o popover automaticamente quando o usuário começa a digitar no campo (hoje só abre ao clicar na seta). Isso garante que conforme digita, a lista filtrada já aparece.
- Aumentar o limite de exibição: mostrar até 50 quando há texto de busca (já é assim) e até 100 quando o usuário só está navegando — ou remover o slice e deixar o scroll do `CommandList` (já tem `max-h-[300px] overflow-y-auto`) cuidar.

**`src/pages/PainelComprasPage.tsx`**
- Confirmar que `useFornecedores` está sendo chamado e populando a lista mesmo antes da primeira pesquisa (já está — depende só de `erpReady`).
- Sem outras mudanças.

### Detalhe técnico
- O filtro já é case-insensitive e cobre tanto `label` (código + nome) quanto `value` (nome).
- Manter o comportamento de "Usar '<texto>'" quando nenhum fornecedor casa, para preservar a busca livre por substring no backend.
- Mudança no `ComboboxFilter` é compatível com todas as outras telas que já usam ele (família, origem, etc.) — só melhora a UX.

### Validação
- Abrir `/painel-compras`, clicar no campo Fornecedor → dropdown abre com lista completa do ERP.
- Digitar "MET" → lista reduz em tempo real para fornecedores que contêm "MET" (em código ou nome), sem precisar Enter.
- Apagar texto → lista volta ao completo.
- Selecionar um item → fecha dropdown e preenche o campo.


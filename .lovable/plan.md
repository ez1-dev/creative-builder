## Diagnóstico atual

Encontrei um indício forte de que **o salvamento no backend está acontecendo**, mas a tela pode estar **recarregando/ordenando de forma diferente do que foi salvo**.

Evidências:
- O dashboard padrão de Passagens já tem widgets persistidos no banco com `layout` alterado.
- Há também configurações salvas, como bloco oculto e gráfico trocado para `ranking-chart`.
- Ou seja: o problema mais provável **não é o botão Salvar em si**, e sim a forma como o layout salvo é reaplicado na interface.

## Causa mais provável

1. **O grid salva `x/y/w/h`, mas a tela ainda ordena por `position`.**
   - No hook `usePassagensLayout`, os widgets são carregados e ordenados por `position`.
   - No modo de edição, o usuário altera principalmente `layout` (`x`, `y`, `w`, `h`).
   - Se `position` não for recalculado junto, a tela pode parecer “voltar” para a ordem antiga após recarregar.

2. **No layout compacto/mobile, a tela ignora o grid salvo e usa só a ordem da lista.**
   - Em `PassagensLayoutGrid`, quando a viewport é compacta, os blocos são renderizados em sequência.
   - Essa sequência depende da ordenação atual dos widgets, não do `x/y` salvo.
   - Resultado: no desktop pode parecer parcialmente certo, mas no compacto aparenta que “não manteve”.

3. **O hook sempre trabalha no dashboard padrão global.**
   - Hoje o fluxo busca `module = 'passagens-aereas'`, `owner_id = null`, `is_default = true`.
   - Se existir expectativa de manter outro layout/visão, ele não está sendo carregado daqui.

## Plano de correção

1. **Sincronizar ordem visual com persistência**
   - Recalcular e salvar `position` com base na ordem real do grid ao clicar em **Salvar layout**.

2. **Carregar e renderizar o layout com a mesma lógica**
   - Garantir que a tela use o layout salvo como fonte principal de verdade, inclusive fora do modo edição.
   - No compacto, derivar a ordem a partir do layout persistido, não de `position` antigo.

3. **Validar o dashboard-alvo do load/save**
   - Confirmar que o mesmo dashboard é usado para carregar e salvar.
   - Se necessário, corrigir para não cair sempre no padrão errado.

4. **Testar o fluxo completo**
   - Arrastar/redimensionar bloco canônico
   - Ocultar/restaurar bloco
   - Criar gráfico customizado
   - Salvar, sair do modo edição e recarregar a página
   - Verificar desktop e compacto

## Detalhes técnicos

Arquivos que eu ajustaria:
- `src/hooks/usePassagensLayout.ts`
- `src/components/passagens/PassagensLayoutGrid.tsx`
- `src/components/passagens/PassagensDashboard.tsx`

Foco da implementação:
- persistir `position` junto com `layout`
- parar de depender de uma ordenação incompatível com o grid salvo
- garantir consistência entre edição, reload e renderização responsiva
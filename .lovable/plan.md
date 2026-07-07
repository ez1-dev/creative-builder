Plano para corrigir o problema no RH:

1. Corrigir abertura da engrenagem em widgets padrão do RH
- Quando o bloco ainda estiver em “Padrão”, selecionar automaticamente um componente compatível da Biblioteca BI.
- Gerar o mapping inicial automaticamente para esse componente, para o preview não ficar vazio esperando seleção manual.
- Se o usuário trocar o tipo de componente, recalcular o mapping com campos válidos da página atual.

2. Corrigir preview dentro do diálogo
- Garantir que o preview use o mesmo contrato de dados que o widget real usa no dashboard.
- Exibir preview real para gráficos, cards e KPIs assim que houver componente e mapping válido.
- Manter mensagem clara apenas quando faltar série/KPI obrigatório.

3. Corrigir “não está levando” para o dashboard
- Ao salvar, persistir sempre `componentId`, `mapping`, `customTitle` e `options.visual` juntos.
- Garantir que widgets RH configurados passem a renderizar pela Biblioteca BI no grid, usando as opções salvas.
- Preservar o fluxo do botão maior “Salvar edição”: a engrenagem salva no rascunho, e o botão “Salvar edição” grava no banco.

4. Manter escopo somente RH
- Alterar apenas os componentes/hook do layout RH necessários.
- Não mexer em Passagens, Frota, Máquinas, Comercial ou demais dashboards.

Validação após implementar:
- Em `/rh/quadro-colaboradores`, entrar em “Editar layout”.
- Abrir engrenagem em um gráfico padrão.
- Ver preview aparecer automaticamente.
- Trocar tipo/aparência/mapping, salvar a engrenagem e confirmar que o bloco muda no dashboard.
- Clicar “Salvar edição”, recarregar e confirmar persistência.
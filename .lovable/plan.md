Plano de correção para o botão “Apresentação”

1. Tornar o botão confiável
- Ajustar o `PresentationToggle` para ter estado de carregamento/salvamento, feedback visual e toast de erro/sucesso.
- Impedir clique duplicado enquanto a preferência está carregando ou salvando.
- Fechar o risco de “clicou mas não aconteceu nada” quando a gravação no backend falha.

2. Corrigir persistência do Modo Apresentação
- Revisar o `DemoModeContext` para capturar erros nas consultas/upserts de `user_demo_preferences`.
- Garantir fallback seguro quando ainda não existir linha de preferência do usuário.
- Evitar problema de estado antigo no `save`, usando atualização funcional/estado mais recente.
- Após ligar/desligar, manter a UI sincronizada imediatamente e recarregar se necessário.

3. Verificar permissões/estrutura no backend
- Conferir se a tabela `user_demo_preferences` tem colunas, grants e policies corretas para o usuário autenticado.
- Se necessário, criar migração de correção sem expor dados reais e sem alterar dados existentes.

4. Fazer o botão realmente afetar a tela atual de BI
- Instrumentar os pontos principais do BI Comercial para consumir `useDemoMode` nos KPIs, valores, nomes de cliente/revenda/produto/documentos e textos relevantes.
- Priorizar a tela onde você está agora (`/bi/comercial`) para validar que ao clicar em “Apresentação” os dados mudam de forma visível.

5. Validar no preview
- Reproduzir o clique no botão via navegador.
- Confirmar que aparece o selo “Modo Apresentação”.
- Confirmar que a preferência permanece após recarregar a página.
- Confirmar que KPIs/valores/nomes da tela BI Comercial ficam mascarados.
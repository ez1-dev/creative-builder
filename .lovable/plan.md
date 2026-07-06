## Plano

1. **Mover o diálogo para dentro do contexto de dados da página**
   - Ajustar `RhDashboardWithBiLibrary` para renderizar o `ConfigureRhWidgetDialog` dentro do `PageDataProvider`.
   - Incluir também o diálogo de adicionar componente da Biblioteca BI dentro desse mesmo provider, para que `usePageData()` tenha acesso a KPIs, séries, linhas e filtros reais.

2. **Centralizar o botão “Adicionar da Biblioteca BI” no helper RH**
   - Remover a renderização direta do `AddRhBiWidgetDialog` de `RhLayoutToolbar`, pois hoje ele fica no header fora do `PageDataProvider`, gerando “Preview indisponível fora da página”.
   - Passar para a toolbar apenas uma ação `onAddClick`, mantendo o botão no mesmo lugar visual.

3. **Preservar o comportamento atual**
   - O botão continua aparecendo somente em modo edição.
   - `onAdd={layout.addWidget}` continua salvando o componente escolhido.
   - O preview passa a usar os dados já enviados para `RhDashboardWithBiLibrary` em cada página RH.

4. **Validar nas páginas RH afetadas**
   - Verificar especialmente `/rh/quadro-colaboradores`, onde o problema foi mostrado.
   - Confirmar que o texto “Preview indisponível fora da página” não aparece mais quando a página fornece dados, e que o componente selecionado renderiza o preview.
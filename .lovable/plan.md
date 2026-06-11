## Problema observado

No bloco **Mix acumulado** (e qualquer outro), quando o usuário abre **Configurar bloco**, troca para um componente da Biblioteca BI tipo mapa de calor e muda a **Paleta do mapa**, a alteração se perde nestes cenários:

1. Não-admin altera e salva → entra no fluxo de **auto-fork** (cria "Minha versão" automaticamente). A mudança é gravada na cópia pessoal do próprio usuário, então **nenhum outro usuário enxerga** a nova paleta.
2. Mesmo usuário troca o toggle **Oficial / Minha versão** depois de salvar → como o reload acontece com o `mode` antigo capturado pelo `useCallback`, a UI mostra a versão "original" (oficial) e dá a impressão de que perdeu a customização.
3. Admin que está vendo **Minha versão** e edita: a gravação vai na pessoal dele, não no Oficial — mesmo efeito (ninguém mais vê).

Como você decidiu que **só admin deve poder mudar e a gravação deve ser no Oficial**, a correção é restringir o fluxo de edição e garantir que o destino do `Configurar bloco` seja sempre o dashboard Oficial.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx`
- **Editar dashboard** passa a ser visível/clicável só para admin (`isAdmin === true`). Hoje aparece também quando `layout.isPersonal` é true para qualquer usuário — remover essa concessão.
- Em `handleEnterEdit`, se o usuário estiver vendo **Minha versão**, forçar o toggle para **Oficial** antes de entrar em edição (await `layout.setMode('official')` + `layout.reload()`). Mensagem informativa: "Edições do Configurar bloco são salvas no dashboard Oficial e ficam visíveis para todos."
- O toggle **Oficial / Minha versão** continua disponível para todos, mas em modo edição já está bloqueado (mantém comportamento atual).
- `handleSaveDashboard`: nenhuma mudança de payload, mas garantir que `layout.isPersonal` seja `false` antes de chamar `saveLayout` (já garantido pelo passo anterior). Se algum usuário não-admin conseguir burlar (cenário improvável), abortar com toast de erro.

### 2. `src/hooks/useComercialLayout.ts`
- Em `ensureDashboard`: remover o auto-fork. Hoje qualquer usuário que tente salvar e não seja admin é auto-forkado para pessoal e a edição vai para a cópia dele. Como agora só admin chega aqui em modo Oficial, basta:
  - Se `isPersonalEffective` → retorna o `dashboardId` pessoal (admin editando a própria Minha versão por escolha explícita — pouco provável após mudança acima, mas mantém integridade).
  - Caso contrário → resolve o id do Oficial (comportamento atual).
  - Remover o ramo `if (needsPersonal) { ... forkToPersonal(); ... }` e o `autoForkToastShownRef`.
- `saveLayout` permanece igual. O reload após salvar continua usando `load({ silent: true })`, mas agora não há mais troca de `mode` durante o save (a edição está sempre em Oficial), então o problema do `useCallback` capturando `mode` antigo deixa de acontecer.

### 3. Sanidade do payload `options.colorStops`
Reler o fluxo para garantir que a paleta sobrevive ao round-trip:

```
ConfigureBiWidgetDialog.handleApply
  → onApply({ options: { colorStops: [...] }, componentId, mapping, ... })
ComercialPage.handleConfigApply
  → mergeConfigDraft(type, { options, componentId, mapping, ... })
ComercialPage.handleSaveDashboard
  → layout.saveLayout([{ type, layout, options, componentId, mapping, ... }])
useComercialLayout.saveLayout → mergeConfig
  → cfg.options = { colorStops: [...] }  (sobrescreve options inteiro — ok)
  → UPDATE dashboard_widgets SET config = cfg WHERE id = ...
load() → mapped widget tem options.colorStops
ComercialPage.effectiveWidgets → renderWidget(w) usa w.options.colorStops
```

Está consistente. Nenhuma mudança de código aqui — só validação manual após implementar os passos 1 e 2.

### 4. Mensageria
- Em `Configurar bloco`, quando admin está em Oficial, deixar claro abaixo do título do diálogo: "Alterações afetam todos os usuários (versão Oficial)."
- Para não-admin, o botão "Editar dashboard" some; o tooltip do toggle "Minha versão" continua explicando que é a cópia pessoal (read-only para Configurar bloco — eles podem usar "Restaurar padrão" via Voltar ao oficial). Sem mudanças adicionais aqui.

## Fora de escopo
- Não mexer no fluxo de `Minha versão` para outros usuários (continua existindo para visualização e drag/resize pessoal — se quiser remover esse caminho também, pedir em uma rodada separada).
- Não mexer em outras páginas BI.
- Sem migration de banco: as policies atuais já permitem admin gravar no Oficial e bloqueiam o resto.

## Validação
1. Como **admin** em Oficial → Editar dashboard → Configurar `Mix acumulado` → trocar para Biblioteca BI → `Brazil heat map` → mudar paleta → Aplicar → Salvar.
   - Esperado: toast "Dashboard salvo", paleta aparece imediatamente.
   - Logout/login e novo acesso: paleta persiste.
2. Como **outro usuário não-admin**: acessar `/bi/comercial` em Oficial → vê a nova paleta.
3. Como **não-admin**: botão "Editar dashboard" não aparece (nem em Oficial nem em Minha versão).
4. Como admin: toggle Oficial → Minha versão → voltar → Oficial: a paleta nova continua visível em Oficial; a pessoal continua independente.

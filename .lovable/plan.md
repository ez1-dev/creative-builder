## Filtro de Unidade de Negócio na DRE Padrão

Ativar automaticamente quando o backend indicar suporte, sem qualquer mudança no comportamento atual até lá.

### Comportamento

- Barra superior lê `meta.suporta_filtro_unidade` da resposta da matriz (`dreMatrizApi`).
- `false` / ausente → nada muda. Segue "Visão consolidada" + análise por unidade só nos drills (estado atual).
- `true` → aparece um Select **Unidade de negócio** no grupo "Dados" do toolbar, com opções vindas do backend (endpoint já existente `/api/contabil/unidades-negocio` se disponível, senão derivadas da própria matriz), incluindo opção "Todas (consolidado)". A seleção é enviada como `unidade` nas chamadas de matriz e propagada aos drills.
- Quando o filtro fica ativo (unidade ≠ Todas), o badge do header troca de "Visão consolidada" para "Unidade: {nome}" e o alerta azul "análise por unidade disponível nos drills" fica oculto.

### Arquivos a editar

- `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx` — estado da unidade selecionada; badge dinâmico; ocultar alerta quando filtrado.
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — renderizar o Select de unidade condicionalmente (`meta.suporta_filtro_unidade === true`); passar `unidade` para hooks de matriz e drills.
- `src/components/dre-studio/DreFilters.tsx` — aceitar prop opcional `showUnidade` + `unidades` e emitir mudanças de `unidade` em `DreStudioFilters`.
- `src/lib/contabil/dreMatrizApi.ts` — já expõe `suporta_filtro_unidade`; garantir envio de `unidade` quando presente.
- Hook de listagem de unidades (novo, pequeno) em `src/hooks/contabil/useUnidadesNegocio.ts`, com fallback silencioso se o endpoint 404.

### Regras

- Zero classificação no frontend. Rótulos amigáveis continuam vindo do próprio backend/rows.
- Se o backend responder 404 no endpoint de unidades, o filtro não aparece (fail-safe).
- Nenhuma mudança visual enquanto `suporta_filtro_unidade` não vier `true` — implantação silenciosa.
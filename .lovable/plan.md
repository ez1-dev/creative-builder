# Modo Demonstração para Investidores

Criar em **Configurações** uma nova aba **"Modo Demonstração"** que permite, com um clique, esconder módulos e mascarar dados sensíveis em toda a aplicação — ideal para apresentar o produto a investidores sem expor informações reais da empresa.

## O que o modo faz

Quando ativado, aplica em tempo real (sem recarregar) três camadas de ofuscação, cada uma configurável individualmente:

1. **Ocultar módulos** — remove itens escolhidos do menu lateral e bloqueia suas rotas (redireciona para o Dashboard). Você escolhe quais módulos esconder (ex.: Regras Senior, ETL, Gestão SGU, Monitor de Usuários, Contas a Pagar…).
2. **Ocultar gráficos/mapas específicos** — reaproveita o catálogo já existente (`VISUAL_CATALOG`) para esconder gráficos individuais dentro das páginas visíveis.
3. **Mascarar dados sensíveis** — substitui em telas de listagem/tabela/BI:
   - **Nomes** de clientes, fornecedores, revendas, colaboradores, motoristas → nomes fictícios estáveis (ex.: "Cliente Alfa 12", "Fornecedor Beta 03") mantendo consistência entre linhas.
   - **Valores monetários e quantidades** → opção "manter valores", "escalar por fator" (ex.: ×0,73) ou "mascarar como R$ ●●●".
   - **Documentos**: CNPJ/CPF/placa/número de nota → padrão `••.•••/••••-••` preservando formato.
   - **Textos livres customizados** — você cadastra pares "de → para" (ex.: "Empresa X" → "ACME Corp") aplicados globalmente em qualquer render de texto.

Um selo discreto **"MODO DEMO"** aparece no topo da aplicação para lembrar que a ofuscação está ativa (só visível para admins).

## Escopo do primeiro release

- Preferência **por usuário logado** (persistida no Cloud, tabela nova `user_demo_preferences`), com botão "Copiar do meu usuário para o perfil" para reaproveitar.
- Ativação é **client-side**: dados reais continuam vindo do backend; o mascaramento acontece na UI (rápido, sem risco de quebrar cálculos).
- Perfis de acesso já existentes continuam funcionando — o Modo Demo é uma camada adicional em cima.

## Estrutura da nova aba

```text
┌ Configurações › Modo Demonstração ─────────────────────┐
│ [●] Ativar modo demonstração                           │
│                                                        │
│ ▸ Módulos ocultos       [Selecionar do menu lateral…]  │
│ ▸ Gráficos ocultos      [Selecionar do catálogo BI…]   │
│ ▸ Mascarar nomes        [ ] Clientes  [ ] Fornecedores │
│                         [ ] Colaboradores  [ ] Motorist│
│ ▸ Valores monetários    ( ) manter (●) escalar ×[0.73] │
│                         ( ) ocultar                    │
│ ▸ Documentos            [ ] CNPJ/CPF  [ ] Placas  [ ] N│
│ ▸ Substituições texto   De: [_______] Para: [_______] +│
│                                                        │
│ [Pré-visualizar]  [Salvar]                             │
└────────────────────────────────────────────────────────┘
```

## Detalhes técnicos

**Backend (Lovable Cloud):**
- Nova tabela `public.user_demo_preferences` (user_id PK, enabled bool, hidden_modules text[], hidden_visuals text[], mask_names jsonb, mask_values jsonb, mask_docs jsonb, text_replacements jsonb, updated_at). RLS: cada usuário lê/escreve só o próprio registro. GRANTs padrão para `authenticated`.

**Frontend:**
- Novo `DemoModeContext` + hook `useDemoMode()` (carrega preferências, expõe `enabled`, helpers `maskName(kind, value)`, `maskCurrency(v)`, `maskDoc(kind, v)`, `applyTextReplacements(s)`, `isModuleHidden(path)`, `isVisualHidden(key)`).
- Integrações:
  - `AppSidebar.tsx` — filtra itens conforme `isModuleHidden`.
  - `App.tsx` — wrapper de rota que redireciona rotas ocultas.
  - `VisualGate` já existente — passa a considerar também `isVisualHidden` do modo demo (união com `useUserVisuals`).
  - Componentes utilitários novos: `<DemoText kind="cliente">{nome}</DemoText>`, `<DemoMoney value={v} />`, `<DemoDoc kind="cnpj">{v}</DemoDoc>`. Instrumentar primeiro as telas de maior exposição (BI Comercial, Painel de Compras, Contas a Pagar/Receber, RH — Quadro/Resumo Folha, Faturamento Genius). Demais telas mascaradas em ondas seguintes.
  - Faixa `<DemoBadge />` fixa no topo quando ativo.
- Nova aba `demo` em `ConfiguracoesPage.tsx` com formulário controlado usando `ALL_SCREENS` e `VISUAL_CATALOG` já existentes para as listagens.

**Fora de escopo agora:**
- Mascaramento em PDFs gerados server-side (relatórios executivos) — anotado para próxima iteração.
- Modo demo por perfil de acesso (só por usuário nesta primeira versão).
- Reescrita automática de todos os componentes legados; começaremos pelas telas prioritárias listadas acima e expandiremos incrementalmente.

## Entrega

Se aprovar, implemento em uma rodada: migration + contexto/hook + aba de Configurações + integração no sidebar/rotas/VisualGate + instrumentação das telas prioritárias + badge de demo.

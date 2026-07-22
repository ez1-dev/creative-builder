# Central de Liberações (Configurações)

Reaproveita a infra atual (`access_profiles`, `profile_screens`, `user_access`) e adiciona **feature flags** e **overrides por usuário**. Admin do sistema e usuários com `can_edit` em `/gestao-perfis-acesso` (gestores de perfil) podem editar.

## Nova aba "Liberações" em `/configuracoes`

Substitui/expande a atual `permissions`. Estrutura em sub-abas:

```text
Liberações
├─ Telas & Menus         (perfil → telas; override por usuário)
├─ Funcionalidades       (ações dentro de telas: exportar, editar, aprovar…)
├─ Integrações           (SID, ETL, IA — liga/desliga por perfil/usuário)
└─ Visual & Demo         (tema, mascaramento, modo demo — padrão + override)
```

Cada sub-aba tem o mesmo layout: seletor **Perfil | Usuário**, busca, lista com switches, e badge "Override" quando o usuário difere do perfil.

## Modelo de dados (novas tabelas no Cloud)

```text
profile_features            (profile_id, feature_key, enabled)          — default por perfil
user_feature_overrides      (user_id,    feature_key, enabled)          — override por pessoa
user_screen_overrides       (user_id, screen_path, can_view, can_edit, can_delete)
```

Resolução em runtime: `override do usuário ?? valor do perfil ?? default do catálogo`. Exposto por um único hook `useFeatureFlag(key)` + extensão de `useUserPermissions` para consumir `user_screen_overrides`.

RLS: leitura pelo próprio usuário (flags dele) + admin/gestor de perfil; escrita apenas admin/gestor (via `has_role` + checagem de `can_edit` em `/gestao-perfis-acesso`). GRANTs para `authenticated` e `service_role`.

## Catálogo de features (código, não tabela)

`src/config/featureCatalog.ts` — fonte da verdade das chaves, agrupadas por área:

- **Telas**: reutiliza `screenCatalog` existente.
- **Funcionalidades**: `dre.exportar_xlsx`, `dre.drill_razao`, `requisicoes.aprovar`, `requisicoes.sid_enviar`, `sgu.aplicar_duplicacao`, `bi.criar_widget`, etc. (levantados dos módulos já existentes).
- **Integrações**: `integracao.sid`, `integracao.etl`, `integracao.ia_gateway`, `integracao.ia_relatorios`.
- **Visual/Demo**: `visual.tema_escuro`, `demo.mascaramento`, `demo.modo_apresentacao`.

Cada entrada: `{ key, label, area, descricao, default }`. Adicionar/remover feature é edição de arquivo, sem migration.

## UI

- **Telas & Menus**: mantém `PermissoesPorTelaPanel` atual e adiciona coluna "Override por usuário" com dialog para editar `user_screen_overrides`.
- **Funcionalidades**: grid `feature × perfil` com switches; painel lateral para overrides do usuário selecionado.
- **Integrações**: cards por integração com switch global (perfil) + lista de exceções por usuário.
- **Visual & Demo**: define padrão do perfil; usuário pode sobrescrever nas próprias preferências (já existe em `user_demo_preferences` / `user_visuals` — apenas ligar ao catálogo).

Badge "Override" e botão "Voltar ao padrão do perfil" em qualquer item alterado individualmente.

## Aplicação no app

- Novo `<FeatureGate feature="dre.exportar_xlsx">` para esconder/desabilitar botões.
- `ProtectedRoute` passa a consultar `user_screen_overrides` além de `profile_screens`.
- Integrações (SID/ETL/IA) checam `useFeatureFlag` antes de habilitar botões e chamadas — retorna mensagem "Recurso não liberado para seu usuário".

## Fora do escopo desta entrega

- Auditoria detalhada de alterações (fica como próximo passo, gravando em `error_logs` ou tabela nova).
- Delegação parcial (gestor de área) — hoje é admin + gestor de perfil global.

## Detalhes técnicos

Migrations: 3 tabelas + índices `(profile_id, feature_key)` e `(user_id, feature_key)`; policies via `has_role('admin')` OR EXISTS em `profile_screens` com `can_edit` em `/gestao-perfis-acesso`.

Hook: `useFeatureFlag(key)` em `src/hooks/useFeatureFlag.ts` — carrega uma vez via Query, cacheia por sessão, invalida ao salvar.

Arquivos principais tocados: `ConfiguracoesPage.tsx` (nova aba), `PermissoesPorTelaPanel.tsx` (coluna override), novos: `LiberacoesFuncionalidadesPanel.tsx`, `LiberacoesIntegracoesPanel.tsx`, `LiberacoesVisualDemoPanel.tsx`, `featureCatalog.ts`, `useFeatureFlag.ts`, `FeatureGate.tsx`.

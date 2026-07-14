## Diagnóstico

As entradas já existem em `ALL_SCREENS` (`ConfiguracoesPage.tsx`), então aparecem no seletor de "Permissões por Tela". Porém, a inclusão no catálogo não cria automaticamente as linhas em `profile_screens` para os perfis já existentes — isso é feito manualmente pelo admin na tela, ou via seed.

Consultando o banco para os perfis com nome contendo "Diretoria":

- **Diretoria** (`2302a693…`): já tem `/contabilidade/balanco`, `/contabilidade/dre-studio/modelos`, `/contabilidade/dre-studio/modelos/novo`. **Falta**: `/contabilidade/dre-studio` (Visão Geral).
- **Diretoria Genius** (`6fe2ad00…`): **não tem nenhuma das 4**.

Por isso os usuários desses perfis não estão vendo/liberando as telas.

## O que fazer

Rodar uma migração de dados (idempotente) que insere/atualiza as 4 telas com `can_view=true, can_edit=true, can_delete=false` para os dois perfis Diretoria.

### Telas alvo

| screen_path | screen_name |
|---|---|
| `/contabilidade/balanco` | Contabilidade — Balanço Patrimonial |
| `/contabilidade/dre-studio` | DRE Studio — Visão Geral |
| `/contabilidade/dre-studio/modelos` | DRE Studio — Modelos |
| `/contabilidade/dre-studio/modelos/novo` | DRE Studio — Novo Modelo |

### Migração (esboço)

```sql
INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit, can_delete)
SELECT ap.id, s.screen_path, s.screen_name, true, true, false
FROM public.access_profiles ap
CROSS JOIN (VALUES
  ('/contabilidade/balanco','Contabilidade — Balanço Patrimonial'),
  ('/contabilidade/dre-studio','DRE Studio — Visão Geral'),
  ('/contabilidade/dre-studio/modelos','DRE Studio — Modelos'),
  ('/contabilidade/dre-studio/modelos/novo','DRE Studio — Novo Modelo')
) AS s(screen_path, screen_name)
WHERE ap.name ILIKE 'Diretoria%'
ON CONFLICT (profile_id, screen_path)
DO UPDATE SET can_view = true, can_edit = true, screen_name = EXCLUDED.screen_name;
```

Observação: se não existir índice único `(profile_id, screen_path)`, ajusto para fazer `UPDATE` primeiro e `INSERT` apenas quando ausente (padrão já usado no projeto).

### Escopo

- Somente dados em `profile_screens`. Sem alterações em `ALL_SCREENS`, componentes ou rotas.
- Aplica aos dois perfis "Diretoria" e "Diretoria Genius". Se você quiser só um deles, me diga antes de aprovar.

### Verificação após aplicar

Rodar `SELECT` mostrando as 4 telas × 2 perfis, todos com `can_view=true`, `can_edit=true`. Usuário desses perfis passa a ver os itens no menu e o `PermissionsProvider` recarrega no próximo login (ou refresh do cache do erpUser).



# Cadastrar rotas do módulo Produção na tabela profile_screens

## Problema
As 7 páginas do módulo Produção foram criadas no código, mas não aparecem no sidebar nem são acessíveis porque o sistema de permissões (`useUserPermissions`) filtra rotas que não estão cadastradas na tabela `profile_screens`.

## Solução
Criar uma migration SQL que insere as 7 telas de produção na tabela `profile_screens` para **todos os perfis existentes** na tabela `access_profiles`, com `can_view = true` e `can_edit = true`.

### Migration SQL

```sql
INSERT INTO profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT p.id, s.screen_path, s.screen_name, true, true
FROM access_profiles p
CROSS JOIN (VALUES
  ('/producao/dashboard',       'Dashboard Produção'),
  ('/producao/produzido',       'Produzido no Período'),
  ('/producao/expedido',        'Expedido para Obra'),
  ('/producao/patio',           'Saldo em Pátio'),
  ('/producao/nao-carregados',  'Itens Não Carregados'),
  ('/producao/leadtime',        'Lead Time Produção'),
  ('/producao/engenharia',      'Engenharia x Produção')
) AS s(screen_path, screen_name)
ON CONFLICT DO NOTHING;
```

Isso garante que todos os perfis de acesso existentes recebam visibilidade das novas telas automaticamente. Administradores poderão ajustar permissões individualmente depois via Configurações.

### Arquivos
- Nenhuma alteração de código necessária, apenas a migration no banco


# Compartilhamento da página Passagens Aéreas via link com token

## Objetivo
Permitir que usuários **sem conta no sistema** acessem a página de Passagens Aéreas (com KPIs, gráficos e tabela) através de um **link especial com token de segurança**. A página será **somente leitura** para quem entrar pelo link — apenas administradores logados continuam podendo cadastrar/editar/excluir.

## Como vai funcionar (visão do usuário)

1. **Administrador** abre a página `/passagens-aereas` e clica no novo botão **"Compartilhar"** no canto superior.
2. Sistema gera um link único, ex.:
   `https://ez-erp-ia.lovable.app/passagens-aereas/compartilhado?token=abc123xyz`
3. Administrador define:
   - **Validade** do link (7, 30, 90 dias ou sem expiração)
   - **Senha opcional** (caso queira proteção extra)
   - **Nome/descrição** (ex.: "Diretoria abril/2026")
4. Link é copiado e enviado por WhatsApp/email aos destinatários.
5. Destinatário abre o link → vê uma tela com os mesmos KPIs, gráficos, filtros e tabela, **sem precisar logar**. Se houver senha, é solicitada antes.
6. Administrador pode **revogar** qualquer link a qualquer momento numa lista de links ativos.

## Alterações necessárias

### 1. Banco de dados (Lovable Cloud)
Nova tabela `passagens_aereas_share_links`:
- token (chave única)
- nome/descrição
- senha (hash, opcional)
- expiração
- ativo (sim/não)
- criado por / em
- contador de acessos e último acesso

Função pública segura `get_passagens_by_token(token, senha)` que valida o token e retorna os dados — única forma de acesso público aos dados, sem expor a tabela diretamente.

### 2. Frontend

**Botão "Compartilhar" no header da página** `/passagens-aereas`:
- Abre modal com:
  - Lista de links ativos (com nome, expiração, acessos, botão revogar)
  - Botão "Gerar novo link" → formulário (nome, validade, senha opcional)
  - Após gerar: campo com link + botão copiar

**Nova rota pública** `/passagens-aereas/compartilhado?token=...`:
- Não exige login
- Se token tem senha: mostra tela pedindo senha
- Se token válido: renderiza a mesma UI da página principal (filtros, KPIs, gráficos, tabela), porém **sem botões de cadastrar/editar/excluir** e **sem o sidebar** (layout limpo, focado no relatório)
- Se token inválido/expirado/revogado: mensagem amigável "Link expirou ou foi revogado"

### 3. Segurança
- Tabela `passagens_aereas` continua bloqueada por RLS (sem acesso público direto)
- Acesso público acontece apenas via função do banco que valida o token
- Token é gerado aleatoriamente (32+ caracteres)
- Senha (se definida) é armazenada com hash
- Cada acesso é registrado (contador + timestamp) para auditoria
- Admin pode revogar instantaneamente

## Detalhes técnicos

**Migração:**
- Tabela `passagens_aereas_share_links` com RLS (apenas admins gerenciam)
- Função `validate_share_token(token text, password text)` SECURITY DEFINER que retorna boolean
- Função `get_passagens_via_token(token text, password text)` SECURITY DEFINER que retorna os registros se token válido

**Arquivos novos:**
- `src/pages/PassagensAereasCompartilhadoPage.tsx` — versão pública somente leitura
- `src/components/passagens/ShareLinksDialog.tsx` — modal de gestão de links
- `src/components/passagens/PassagensDashboard.tsx` — componente reutilizável com KPIs/gráficos/tabela (extraído da página atual para reaproveitar nas duas versões)

**Arquivos editados:**
- `src/pages/PassagensAereasPage.tsx` — usa novo componente `PassagensDashboard`, adiciona botão Compartilhar
- `src/App.tsx` — registra rota pública `/passagens-aereas/compartilhado` (fora do `AppLayout`, sem `ProtectedRoute`)

## O que NÃO muda
- Página administrativa `/passagens-aereas` continua igual (login + permissão de perfil obrigatória)
- Cadastro/edição/exclusão continua exclusivo de administradores logados
- Permissões de outros módulos não são afetadas

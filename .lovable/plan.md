## Objetivo

Permitir cadastrar novos "Tipo de Máquina" na tela `/manutencao-maquinas` sem ficar preso à lista fixa (`TIPO_MAQUINA_OPTIONS`), com duas formas de uso: digitar direto no formulário (com sugestões dos tipos já existentes) e uma tela dedicada para gerenciar a lista oficial.

## Mudanças

### 1. Backend (Cloud) — nova tabela `tipos_maquina`

Migration criando:
- `public.tipos_maquina` (`nome` text único upper, `ativo` boolean default true, `created_by`, `created_at`, `updated_at`)
- GRANT para `authenticated` + `service_role`
- RLS:
  - SELECT: qualquer usuário autenticado
  - INSERT/UPDATE/DELETE: `is_admin(auth.uid())` OR `can_edit_maquinas(auth.uid())`
- Trigger `update_updated_at_column`
- Trigger normalizando `nome` para UPPER/trim
- Seed inicial com os valores já existentes em `TIPO_MAQUINA_OPTIONS` + os distintos já gravados em `manutencao_maquinas.tipo_maquina`

Obs.: a coluna `manutencao_maquinas.tipo_maquina` continua sendo `text` livre — não vira FK, para não quebrar histórico nem importações. A tabela `tipos_maquina` serve como catálogo/sugestão.

### 2. Componente `TipoMaquinaCombobox`

Novo `src/components/maquinas/TipoMaquinaCombobox.tsx`:
- Carrega `tipos_maquina` ativos via supabase
- Combobox (Command + Popover do shadcn) com busca
- Botão "Criar novo tipo: XYZ" quando o termo digitado não existe — insere na tabela (se usuário tiver permissão) e seleciona
- Se usuário sem permissão de edit: comporta como select simples

### 3. Formulário em `ManutencaoMaquinasPage.tsx`

Trocar o `<Select>` de `tipo_maquina` pelo `TipoMaquinaCombobox`. Manter valor em UPPER (já normalizado por trigger).

### 4. Tela de gestão `/manutencao-maquinas/tipos`

Nova página `src/pages/maquinas/TiposMaquinaPage.tsx`:
- Lista a tabela `tipos_maquina` (nome, ativo, criado em)
- Ações (somente quem tem `can_edit_maquinas` / admin): adicionar, renomear, ativar/desativar, excluir
- Aviso ao excluir tipo que ainda está em uso em `manutencao_maquinas` (apenas informativo — não bloqueia, já que a coluna é livre)

Adicionar rota em `App.tsx` e botão "Gerenciar tipos" no header de `ManutencaoMaquinasPage` (visível só com permissão de edit).

### 5. Componentes derivados

`MaquinasDashboard` e gráficos `chart-tipo-maquina` continuam funcionando, pois leem direto do registro — sem mudança.

## Fora de escopo

- Migrar `tipo_maquina` para FK
- Replicar a mesma ideia em Frota/Passagens (pode ser feito depois com a mesma estrutura)

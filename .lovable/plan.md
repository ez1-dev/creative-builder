# Monitor de Usuários Senior

Nova página administrativa para acompanhar sessões ativas no ERP Senior/Sapiens via backend FastAPI e permitir desconexão controlada com motivo.

## O que será criado

### 1. Rota e navegação
- Rota: `/monitor-usuarios-senior` (protegida por `ProtectedRoute`).
- Item no `AppSidebar.tsx` com ícone `Users` (lucide), seguindo o padrão dos demais módulos.
- Registro em `App.tsx` ao lado das demais rotas autenticadas.

### 2. Página `src/pages/MonitorUsuariosSeniorPage.tsx`

**Cards de KPI no topo** (usando `KPICard`/`KpiGroup` já existentes):
- Total de sessões
- Usuários distintos
- Sessões há mais de 4h (destaque vermelho)
- Total por módulo — card único listando os 3 módulos com mais sessões (ou um grid compacto se houver poucos módulos)

**Filtros** (`FilterPanel` ou linha de inputs no padrão existente):
- Usuário Senior (texto)
- Computador (texto)
- Módulo (texto)
- Aplicativo (Select; padrão `SAPIENS`, com opções dinâmicas do retorno)
- Botão **Atualizar** (ícone `RefreshCw`)
- Switch **Auto-atualizar (30s)** ligado por padrão; quando ligado, dispara `setInterval` de 30s e mostra contador "Próx. atualização em Xs"

**Tabela** (componente `Table` shadcn, com `overflow-x-auto` para responsividade) com as colunas pedidas:
Sessão · Usuário Senior · Usuário Windows · Computador · Aplicativo · Cód. módulo · Módulo acessado · Data/hora conexão · Min. conectado · Instância · Tipo aplicação · Mensagem admin · Ações.

- Linhas com `> 240 min` recebem badge âmbar/vermelha em "Min. conectado".
- Coluna "Ações": botão `Desconectar` (variant `destructive`, size `sm`) — visível apenas para usuários autorizados.

**Modal de confirmação** (`AlertDialog`):
- Mostra resumo da sessão (usuário, computador, módulo).
- Campo obrigatório `Motivo` (`Textarea`, mínimo 5 caracteres, validado com zod).
- Checkbox/aviso "Esta ação encerrará a sessão imediatamente".
- Botões: Cancelar / Confirmar Desconexão (loading enquanto envia).

### 3. Integração com backend
Usar o `api` client em `src/lib/api.ts` (que já adiciona `Authorization`, `ngrok-skip-browser-warning` e `VITE_API_BASE_URL`).

- `GET /api/senior/sessoes` — lista de sessões ativas. Chamada inicial, no botão Atualizar e a cada 30s quando o auto-refresh está ligado.
- `POST /api/senior/sessoes/{numsec}/desconectar` com body:
  ```json
  { "confirmar": true, "motivo": "texto informado" }
  ```
  Em sucesso: `toast.success`, fecha modal, recarrega a lista. Em erro: `toast.error` com mensagem do backend.

### 4. Segurança / autorização
Botão **Desconectar** e modal só ficam disponíveis para usuários ADMIN ou RENATO. A regra usa o que já existe no app:

- Admin: `localStorage.getItem('erp_is_admin') === 'true'` (definido pelo `AuthContext` quando o perfil de acesso é "Administrador").
- RENATO: `erpUser?.toUpperCase() === 'RENATO'` lido do `useAuth()`.

```ts
const canDisconnect = isAdmin || erpUser?.toUpperCase() === 'RENATO';
```

Para os demais usuários a coluna "Ações" mostra um traço ou badge "Somente consulta". A visibilidade da própria página continua controlada por `useUserPermissions`/`profile_screens` como nas outras telas (registramos a screen via Configurações; o seed inicial pode ser feito manualmente pelo admin).

### 5. Detalhes técnicos

- Tipo `SessaoSenior` definido no topo do arquivo da página com os campos retornados pelo backend (numsec, usuario_senior, usuario_windows, computador, aplicativo, cod_modulo, modulo, data_hora_conexao, minutos_conectado, instancia, tipo_aplicacao, mensagem_admin).
- Filtros aplicados client-side sobre o array carregado (evita refetch a cada digitação) — o botão Atualizar/timer é que recarrega do servidor.
- Auto-refresh:
  ```ts
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);
  ```
- Validação do motivo via `zod` (mín. 5, máx. 500 chars).
- Toasts via `@/hooks/use-toast` (padrão do projeto).
- Datas formatadas com `src/lib/format.ts` se houver helper; senão `Intl.DateTimeFormat('pt-BR')`.

### 6. Arquivos tocados

- **Novo:** `src/pages/MonitorUsuariosSeniorPage.tsx`
- **Editado:** `src/App.tsx` (rota)
- **Editado:** `src/components/AppSidebar.tsx` (item de menu)

Após aprovação, implemento direto. Confirma?

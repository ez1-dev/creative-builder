# Gestão SGU — Usuários ERP Senior

Tela administrativa crítica para listar usuários do SGU, comparar permissões e duplicar parâmetros E099* com preview campo a campo e dupla confirmação. Toda a comunicação usa a API ERP externa (FastAPI/ngrok) já configurada em `app_settings.erp_api_url`, reaproveitando o `ApiClient` existente em `src/lib/api.ts` (que já trata `Authorization: Bearer`, `ngrok-skip-browser-warning`, 401, erros de rede e logging).

## Arquivos a criar

- `src/pages/GestaoSguUsuariosPage.tsx` — página principal com 4 abas (shadcn `Tabs`).
- `src/lib/sguApi.ts` — wrapper tipado dos 6 endpoints SGU usando o `api` singleton.
- `src/components/sgu/SguUsuariosTab.tsx` — Aba 1 (lista + busca + ações).
- `src/components/sgu/SguCompararTab.tsx` — Aba 2 (origem/destino + comparação por tabela).
- `src/components/sgu/SguPreviewCamposTab.tsx` — Aba 3 (preview campo a campo + filtros + KPIs).
- `src/components/sgu/SguAplicarDuplicacaoTab.tsx` — Aba 4 (motivo + confirmação dupla + modal "CONFIGURAR").
- `src/components/sgu/SguContext.tsx` — `SguProvider` com estado compartilhado entre abas: `usuarioOrigem`, `usuarioDestino`, `previewResultado`, `mostrarCamposIguais`, `tabelasSelecionadas`.

## Arquivos a editar

- `src/App.tsx` — registrar rota `/gestao-sgu-usuarios` dentro de `<AppLayout />` envolvida por `<ProtectedRoute path="/gestao-sgu-usuarios">` e pelo `SguProvider`.
- `src/components/AppSidebar.tsx` — adicionar item "Gestão SGU" (ícone `ShieldCheck` ou `UserCog`) no array `modules`.
- `src/lib/screenCatalog.ts` — registrar `'/gestao-sgu-usuarios': { codigo: 'SGU_USR', nome: 'Gestão SGU - Usuários ERP Senior' }`.

## Login e tokens

- O `ApiClient` em `src/lib/api.ts` já implementa `login(usuario, senha)` chamando `POST /login?usuario=...&senha=...` (query string, não FormData) e armazenando `access_token` + `usuario` em localStorage. **Vou reutilizar esse fluxo** — ele já está alinhado ao formato exigido (usuario/senha, Bearer token).
- Em `sguApi.ts`, antes de cada chamada, se `api.getToken()` for nulo, abre um diálogo de re-login (ou direciona para `/login`). Em 401, limpa token via `api.logout()` e tenta uma única vez; se falhar de novo, mostra "Token expirado ou inválido."
- Não enviar senha em nenhum body além do `/login`.

## Endpoints (em `sguApi.ts`)

```
GET  /api/sgu/usuarios?filtro={texto}
GET  /api/sgu/usuarios/{codusu}
GET  /api/sgu/usuarios/{codusu}/resumo-acessos
POST /api/sgu/usuarios/comparar              { usuario_origem, usuario_destino }
POST /api/sgu/usuarios/duplicar-preview-campos { usuario_origem, usuario_destino, tabelas[], mostrar_campos_iguais }
POST /api/sgu/usuarios/duplicar-parametros    { usuario_origem, usuario_destino, motivo, confirmar, tabelas[] }
```

Constante exportada `TABELAS_E099 = ['E099USU','E099CPR','E099FIN','E099GCO','E099UCP','E099UDE','E099USE','E099UVE']`.

## Aba 1 — Usuários

- Input de busca + botão "Pesquisar" → `getUsuarios(filtro)`.
- Tabela shadcn com colunas: Código, Nome, Tipo colab., Empresa, Filial, R910, R999, Qtd E099USU, Ações.
- Badges destrutivos (`variant="destructive"`) para `existe_r910 = 0` ("Sem R910") e `existe_r999 = 0` ("Sem R999").
- Linha com `qtd_empresas_e099usu = 0` mostra ícone `AlertTriangle` + tooltip "Usuário sem parametrização no Gestão Empresarial".
- Ações: botões "Ver detalhes" (drawer com `getUsuario` + `getResumoAcessos`), "Usar como origem", "Usar como destino" — atualizam `SguContext`.
- Paginação local (50 por página) usando `PaginationControl` existente.

## Aba 2 — Comparar usuários

- Dois cards mostrando origem/destino selecionados no contexto (ou aviso "Selecione na aba Usuários").
- Botão "Comparar" → `compararUsuarios(origem, destino)`.
- Tabela: Tabela | Qtd origem | Qtd destino | Status (Badge):
  - igual → `secondary` "Quantidade igual"
  - origem > destino → `destructive` "Destino incompleto"
  - origem < destino → `outline` amarelo "Destino tem registros extras"
- `<Alert>` fixo: "Quantidade igual não significa permissão igual. Use o Preview por Campo para validar diferenças internas."

## Aba 3 — Preview por campo

- Botão "Gerar preview por campo", checkbox "Mostrar campos iguais" → `duplicarPreviewCampos(...)` salva `previewResultado` no contexto.
- 4 KPI cards (componente `KPICard` existente): Total diferenças, Alterações planejadas (ALTERAR), Campos preservados (MANTER), Registros a inserir (INSERIR).
- Filtros (Selects + Input): Tabela, Empresa, Campo, Ação, Buscar texto.
- Tabela: Tabela, Empresa, Campo, Valor origem, Valor destino, Ação (Badge colorido), Motivo.
- Cores das ações via classes do design system:
  - ALTERAR → `bg-warning text-warning-foreground` (amarelo/laranja)
  - INSERIR → `bg-info text-info-foreground` (azul)
  - MANTER / IGNORAR → `bg-muted text-muted-foreground` (cinza)
  - Erro → `destructive`
- Campos preservados de E099USU exibem motivo "Campo preservado do usuário destino."
- `<Alert>` fixo no topo: "A duplicação não altera senha, login, bloqueio, nome, cadastro base R910USU/R999USU nem históricos R999. Apenas parâmetros E099* serão considerados."

## Aba 4 — Aplicar duplicação

- Botão "Aplicar duplicação" só habilita se: origem ✓, destino ✓, `previewResultado` existe, `total_diferencas > 0`, motivo preenchido (mínimo 10 chars), checkbox marcado.
- Resumos origem/destino + lista de tabelas afetadas.
- `Textarea` "Motivo da duplicação" (obrigatório).
- `Checkbox` "Confirmo que revisei o preview e desejo aplicar os parâmetros do usuário origem no destino."
- Ao clicar Aplicar → `<AlertDialog>` exigindo digitar "CONFIRMAR" (case-sensitive) num input para liberar o botão de submit.
- Submete `duplicarParametros({ ..., confirmar: true, tabelas: TABELAS_E099 })`.
- Sucesso: toast verde "Parâmetros SGU duplicados com sucesso. Senha, login, bloqueio e cadastro base não foram alterados." + reexecuta `compararUsuarios` e `duplicarPreviewCampos`.

## Aba 5 — Logs / Auditoria

Placeholder com `<Alert>` "Endpoint de auditoria ainda não publicado." Mantém estrutura pronta para futura ativação.

## Tratamento de erros (centralizado em `sguApi.ts`)

Wrapper que mapeia `err.statusCode`:

| Status | Mensagem (toast.error) |
|---|---|
| 401 | logout + 1 retry; se falhar: "Token expirado ou inválido." |
| 403 | "Usuário sem permissão para administrar SGU." |
| 404 | "Endpoint SGU ainda não publicado no backend." |
| 422 | mensagem `err.message` (já formatada pelo ApiClient) |
| 500 | "Erro interno do backend SGU: " + detalhe |
| `isNetworkError` (status 0) | "Backend ERP/ngrok offline. Verifique se a API está ativa." |

Toda chamada loga no console: `console.info('[SGU]', { url, method, status, response, ts: new Date().toISOString() })`.

## Permissão de acesso

- `<ProtectedRoute path="/gestao-sgu-usuarios">` já cobre o fluxo padrão: admin tem acesso total; perfis comuns precisam ter `/gestao-sgu-usuarios` liberado em `useUserPermissions`. O administrador concede via tela existente de Perfis de Acesso.

## Design

- shadcn `Tabs`, `Card`, `Table`, `Badge`, `Alert`, `AlertDialog`, `Select`, `Checkbox`, `Textarea`, `Input`, `Button`.
- Tokens semânticos do design system (`bg-primary`, `bg-warning`, `bg-info`, `text-destructive`, `bg-muted`) — sem cores hardcoded.
- Layout: `PageHeader` no topo + KPIs + abas + tabelas paginadas.

## Estrutura de fluxo

```text
[Aba 1 Usuários] --selecionar origem/destino--> [SguContext]
                                                     |
                                                     v
[Aba 2 Comparar] -- compararUsuarios --> tabela quantidades
                                                     |
                                                     v
[Aba 3 Preview]  -- duplicarPreviewCampos --> previewResultado (contexto)
                                                     |
                                                     v
[Aba 4 Aplicar] (gates: origem, destino, preview, motivo, checkbox, modal CONFIRMAR)
                 -- duplicarParametros --> sucesso → recarrega Aba 2 + Aba 3
```

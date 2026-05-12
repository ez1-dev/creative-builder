# Editor de Regras LSP

Adicionar um editor dedicado para o fonte LSP das regras do portal, mantendo a separação clara entre registros vindos do ERP Senior (E098REG) — que só têm vínculo — e regras do portal — que têm fonte editável.

## 1. Nova página: editor de fonte LSP

**Rota:** `/regras-senior/regras/:id/editor`
**Arquivo:** `src/pages/regras-senior/RegraEditorPage.tsx`
**Registro:** adicionar `<Route>` em `src/App.tsx` logo após a rota `/regras-senior/regras/:id`.

Layout:

```text
+-----------------------------------------------------------+
| << Voltar    Regra: <nome>        [Badge Portal/ERP]      |
| Cód ERP  Módulo  Identificador  Transação  Status  Amb.   |
| Ticket  Motivo                                             |
+-----------------------------------------------------------+
| 001 | ...                                                  |
| 002 | ...   (textarea monoespaçado, min-h-[600px])         |
| ... |                                                      |
+-----------------------------------------------------------+
| [Salvar] [Validar] [Exportar TXT]                         |
+-----------------------------------------------------------+
```

Comportamento:
- `useEffect` chama `seniorApi.obterRegra(id)` ao montar. Em erro, faz fallback: tenta achar a regra na última listagem em memória via querystring `?from=list` (opcional) ou apenas mostra toast "Não foi possível carregar a regra".
- Se `origem === 'E098REG'`: exibe banner amarelo "Fonte LSP ainda não importado para o portal. Este registro vem da E098REG e representa apenas o vínculo do identificador com o código da regra." + botão **Clonar para Portal** (abre `ClonarParaPortalDialog`). Editor e botão Salvar ficam desabilitados.
- Se `origem === 'PORTAL'`: editor habilitado. Campos editáveis: `nome_regra`, `descricao`, `ticket`, `motivo`, `fonte_lsp`. Outros (codemp/modsis/idereg/codtns/codreg_erp/ambiente/status) só leitura.
- **Salvar** → `seniorApi.atualizarRegra(id, payload)` com o payload exato pedido pelo usuário.
- **Validar** → `seniorApi.validarRegra(id)`; toast com avisos.
- **Exportar TXT** → `window.open(seniorApi.exportarRegraTxtUrl(id))`.
- **Voltar** → `navigate(-1)` ou `/regras-senior/regras`.

Numeração de linhas: componente simples `LineNumberedTextarea` interno — div à esquerda com números sincronizados via `onScroll` ao textarea. Fonte `font-mono text-xs`, `min-h-[600px]`, `whitespace-pre`.

## 2. Ajustes na listagem `RegrasList.tsx`

Adicionar coluna **Fonte LSP** entre Status e Ambiente:
- Portal → badge verde "Fonte disponível" (`r.fonte_lsp` presente) ou cinza "Sem fonte" (Portal sem fonte ainda).
- E098REG → badge amarelo "Fonte não importado".

Ajustar dropdown de ações:
- **Portal**: já existe "Editar fonte LSP" — trocar destino para `/regras-senior/regras/${id_regra}/editor` em vez de `?edit=1`. Demais ações (Validar, Exportar TXT, Ver Versões, Alterar status) permanecem.
- **E098REG**: adicionar item **"Abrir editor"** que navega para `/regras-senior/regras/${id_regra}/editor` quando `id_regra != null`; quando `id_regra == null`, abre um pequeno alert dialog com a mensagem padrão e CTA "Clonar para Portal". Manter "Clonar para portal" como já está.

## 3. Modal Clonar para Portal

`ClonarParaPortalDialog.tsx` já existe e cobre os campos pedidos. Ajustes mínimos:
- Após sucesso, redirecionar para `/regras-senior/regras/${novoId}/editor` (hoje vai para `?edit=1`).
- Garantir `ambiente: 'homologacao'` (já está).

## 4. Detalhes técnicos

- Nenhuma alteração em `senior/api.ts`, `senior/types.ts` ou rotas existentes além do `<Route>` novo do editor.
- `seniorApi.atualizarRegra` já chama `POST /api/senior/regras/:id` — compatível com o payload solicitado.
- Sem mudanças em login, autenticação ou layout global.
- Tudo usando tokens semânticos do design system (badges via `bg-primary/10`, `bg-accent/30`, etc.).

## Arquivos

```text
NOVO  src/pages/regras-senior/RegraEditorPage.tsx
EDIT  src/App.tsx                                    (registrar rota)
EDIT  src/components/regras-senior/RegrasList.tsx    (coluna Fonte + ações)
EDIT  src/components/regras-senior/ClonarParaPortalDialog.tsx (redirect)
```

## Fora do escopo

- Editor com syntax highlight real (Monaco/CodeMirror) — fica como evolução; agora é textarea com numeração simples.
- Importação de TXT durante a clonagem.
- Alterações em autenticação, rotas existentes, ou layout do app.

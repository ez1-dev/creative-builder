## Expandir visualização/importação de código LSP

Backend já corrige o conflito de rotas. No frontend, completar as funcionalidades:

### 1. `src/lib/senior/api.ts`

- Estender tipo de resposta de `obterCodigoRegra` para incluir `nome_regra?`, `hash?`, `id_regra?`.
- Atualizar `importarFonteRegra` para aceitar novos campos:
  ```ts
  { codemp?: number|null; codreg_erp; modsis; idereg; codtns;
    nome_regra; descricao?: string|null; fonte_lsp; motivo;
    ticket?: string|null; importar_para_portal?: boolean }
  ```
- Adicionar `importarLoteRegras(payload)`:
  ```ts
  POST /api/senior/regras/importar-lote
  payload: { texto_lote; motivo; ambiente; ticket?; origem_fonte: 'TEXTO_COLADO'; importar_para_portal: boolean }
  → { total_detectado; importadas; atualizadas; erros; itens?: Array<{ codreg_erp; nome_regra; modsis; idereg; descricao?; id_regra?; alertas?: string[] }> }
  ```

### 2. `src/components/regras-senior/VerCodigoLspDialog.tsx`

- Mostrar no cabeçalho: Código, Módulo, Identificador, Transação, **Nome**, **Origem da fonte**, **Hash** (badge muted, monospace, truncate).
- Tratamento de erro mais granular (`err.statusCode`):
  - **422**: "Erro ao buscar código LSP. Verifique se o backend foi atualizado com as rotas fixas antes das rotas paramétricas."
  - **404**: "Fonte LSP não encontrado."
  - **401**: o `api.ts` já lança erro 401 com mensagem clara; redirecionar via `navigate('/login')`.
  - Outros: mensagem genérica.
- Botão "Editar no portal" só aparece quando `resp.id_regra ?? regra.id_regra` existir — usar esse id ao navegar para `/regras-senior/regras/:id/editor`.
- Remover botão de clonagem deste modal (clonagem segue existindo no menu de ações da listagem).
- Após sucesso da importação interna (via `ImportarFonteLspDialog`), além de re-chamar `obterCodigoRegra`, chamar `onAfterClonar?.()` para o list refrescar.

### 3. `src/components/regras-senior/ImportarFonteLspDialog.tsx`

Adicionar campos e atualizar payload:

- Campos **readonly**: Código da regra (`codreg_erp`), Empresa (`codemp`), Módulo, Identificador, Transação.
- Campos **editáveis**: Nome da regra, Descrição (textarea curta), Ticket (opcional), Motivo (obrigatório), Fonte LSP (textarea grande), e checkbox "Importar para portal como regra editável" marcado por padrão.
- Payload:
  ```ts
  {
    codemp: regra.codemp ?? null,
    codreg_erp: regra.codreg_erp,
    modsis: regra.modsis,
    idereg: regra.idereg,
    codtns: regra.codtns ?? '',
    nome_regra,
    descricao: descricao || null,
    fonte_lsp,
    motivo,
    ticket: ticket || null,
    importar_para_portal,
  }
  ```

### 4. `src/components/regras-senior/ImportarLoteRegrasDialog.tsx` (novo)

Modal com:

- `<Textarea>` grande para `texto_lote` (font-mono, ~24 linhas, placeholder explicando formato "Código: ... - Descrição: ...").
- `Motivo` (obrigatório), `Ticket` (opcional).
- `Ambiente` (Select: HOMOLOGACAO / PRODUCAO; default HOMOLOGACAO).
- Checkbox **Importar para portal como regra editável** (default true).
- Botão "Processar importação" → `seniorApi.importarLoteRegras(...)`.
- Após resposta: substituir o formulário pela tela de **resumo** com 4 stat cards (Total detectado, Importadas, Atualizadas, Erros) e tabela de itens (Código, Nome, Módulo, Identificador, Descrição, ID portal, Alertas). Botão "Fechar e atualizar" chama `onDone()` (recarrega lista) e fecha.
- Em caso de erro de chamada, mostrar Alert vermelho + botão "Tentar novamente" (sem fechar o formulário).

### 5. `src/components/regras-senior/RegrasList.tsx`

- Adicionar botão **Importar lote** no `PageHeader.actions` (antes de "Nova regra"), ícone `Upload`/`FileUp`.
- Estado `const [openLote, setOpenLote] = useState(false);` e renderização condicional do novo dialog.
- Após importação bem-sucedida, chamar `carregar()`.
- Garantir que a ação "Ver código LSP" continue disponível em ambas as origens (já está) e que "Editar fonte" só apareça para PORTAL (já está). Não filtrar registros com `id_regra=null`.

### Fora de escopo

- Nenhuma mudança em autenticação, rotas, layout geral, ou em outras telas.
- Não mexer no fluxo de clonagem existente (`ClonarParaPortalDialog`).
- Não criar rota nova; tudo segue via modais.
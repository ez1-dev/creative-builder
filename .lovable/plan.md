## Adicionar ação "Ver código LSP"

### 1. `src/lib/senior/api.ts` — Novos métodos

```ts
obterCodigoRegra: (params: { codreg: string|number; modsis: string; idereg: string; codtns?: string }) =>
  api.get<{ fonte_disponivel: boolean; fonte_lsp?: string; origem_fonte?: string; codreg?: string; modsis?: string; idereg?: string; codtns?: string }>(`${BASE}/regras/codigo`, params),

importarFonteRegra: (payload: {
  codreg_erp: string|number; modsis: string; idereg: string; codtns: string;
  nome_regra: string; fonte_lsp: string; motivo: string;
}) => api.post(`${BASE}/regras/importar-fonte`, payload),
```

### 2. `src/components/regras-senior/VerCodigoLspDialog.tsx` (novo)

Modal único que cobre os dois fluxos:

- Recebe `regra: RegraLSP` e ao montar chama `seniorApi.obterCodigoRegra({ codreg: regra.codreg_erp, modsis, idereg, codtns })`.
- **Loading**: spinner.
- **`fonte_disponivel === true`**:
  - Título: "Código LSP da Regra".
  - Cabeçalho com Código da regra, Módulo, Identificador, Transação, Origem da fonte (badge).
  - `<textarea readOnly>` ou `<pre>` com classe `font-mono text-xs bg-muted` mostrando `fonte_lsp` (altura fixa, scroll).
  - Botões: **Copiar código** (`navigator.clipboard.writeText` + toast), **Clonar/Editar no portal** (se `origem==='PORTAL'` e `id_regra` → navega `/regras-senior/regras/:id/editor`; senão abre `ClonarParaPortalDialog`), **Voltar** (fecha).
- **`fonte_disponivel === false`**:
  - Aviso (Alert variant warning): "Fonte LSP ainda não importado para o portal. Este registro vem da E098REG e representa apenas o vínculo do identificador com o código da regra."
  - Botão **Importar fonte LSP** → abre `ImportarFonteLspDialog`.
- Após sucesso da importação: re-chama `obterCodigoRegra` e exibe o código.

### 3. `src/components/regras-senior/ImportarFonteLspDialog.tsx` (novo)

Dialog com formulário:

- Campos somente leitura: Código da regra (`codreg_erp`), Módulo, Identificador, Transação.
- Campos editáveis: Nome da regra (pré-preenchido com `regra.nome_regra`), Fonte LSP (`<Textarea>` grande, ~20 linhas, `font-mono`), Motivo (obrigatório).
- Validação: `fonte_lsp` e `motivo` obrigatórios.
- Submit: `seniorApi.importarFonteRegra({...})` → toast sucesso → `onImported()` que faz o `VerCodigoLspDialog` recarregar.

### 4. `src/components/regras-senior/RegrasList.tsx`

Adicionar `import { Code2 } from 'lucide-react'` e estado `const [verCodigo, setVerCodigo] = useState<RegraLSP | null>(null);`.

Adicionar item no `DropdownMenu` em **ambos os ramos** (E098REG e Portal), entre "Regra de negócio" e os demais:

```tsx
<DropdownMenuItem onClick={() => setVerCodigo(r)}>
  <Code2 className="mr-2 h-4 w-4" />Ver código LSP
</DropdownMenuItem>
```

Renderizar `{verCodigo && <VerCodigoLspDialog regra={verCodigo} onClose={() => setVerCodigo(null)} onAfterClonar={() => { setVerCodigo(null); carregar(); }} />}`.

### 5. `src/pages/regras-senior/RegraNegocioPage.tsx`

Adicionar botão "Ver código LSP" na toolbar/cabeçalho da página (ambos os modos PORTAL e E098REG) que abre o mesmo `VerCodigoLspDialog` com a regra atual.

### Fora de escopo

- Não criar rota nova; tudo via modal (mais leve, e o usuário não pediu rota).
- Não mexer em autenticação, login, layout geral ou outras telas.
- Não alterar o backend.
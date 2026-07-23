## Objetivo
Alinhar a tela **Indicadores Contábeis** ao contrato atualizado (21/07/2026): trocar a análise IA para **SSE streaming** (não estoura timeout, texto aparece digitando) e adicionar o botão **Exportar Excel** de conferência. Os números, badges, drawer de auditoria e alerta de duplicidade 612 já estão no ar e serão preservados.

## Escopo

### 1. Streaming SSE da análise IA
Arquivo: `src/lib/contabil/indicadoresApi.ts`
- Adicionar `streamIndicadoresAnalise(params, { onMeta, onDelta, onDone, onErro, signal })` usando `fetch` + `ReadableStream` (não usar `EventSource` — precisa de header `Authorization`).
- URL: `GET /api/contabil/indicadores/analise/stream` com `codemp` default 1.
- Reusar base URL, token e header `ngrok-skip-browser-warning` do `contabilApi` (extrair um helper interno `buildContabilRequestInit()` em `contabilApi.ts` que devolve `{ url, headers }` para não duplicar lógica).
- Parser de SSE: bufferizar por `\n\n`, extrair `event:` e `data:`, tratar `meta` | `delta` | `done` | `erro`. JSON.parse em try/catch (evento malformado não derruba o stream).
- Manter `fetchIndicadoresComAnalise` como fallback (já com timeout 90s).

Arquivo: `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
- Substituir o uso de `useIndicadoresAnalise` pela leitura em stream. Estado local:
  - `narrativaStream: string`, `streamStatus: 'idle' | 'streaming' | 'done' | 'erro'`, `streamErro?: string`, `modeloIA?: string`.
- Botão "Gerar análise":
  - Ao clicar → cria `AbortController`, zera estado, chama `streamIndicadoresAnalise`.
  - Rótulo dinâmico: "Gerar análise" → "Gerando…" (desabilitado) → "Gerar novamente" após `done`/`erro`.
  - `onDelta` concatena texto e re-renderiza (React state); markdown re-renderiza a cada delta (já usamos `react-markdown`).
  - `onErro` mostra `Alert` com a mensagem, mantém a tela funcional (números seguem válidos).
  - Abortar stream em curso se o usuário mudar filtros ou desmontar a página.
- Subtítulo do box: **"A IA interpreta os números acima — não recalcula nada."**
- Remover o hook `useIndicadoresAnalise` e a chamada não-streaming do fluxo padrão (mantém a função na API só como fallback documentado).

### 2. Botão "Exportar Excel"
Arquivo: `src/lib/contabil/indicadoresApi.ts`
- Adicionar `downloadIndicadoresExcel(params)` que faz `fetch` autenticado ao `GET /api/contabil/indicadores/exportar`, converte para `Blob`, monta `<a download>` com nome `indicadores_contabeis_{codemp}_{ini}_{fim}.xlsx` e revoga a URL. Trata `!resp.ok` lendo texto de erro.

Arquivo: `src/pages/contabilidade/IndicadoresContabeisPage.tsx`
- Botão "Exportar Excel" no header, ao lado do "Atualizar":
  - Ícone `FileSpreadsheet`, tooltip: *"Baixa a planilha com os números auditáveis conta a conta, para a contabilidade validar."*
  - Estado `exporting: boolean`; enquanto verdadeiro rótulo vira "Gerando Excel…" e o botão fica `disabled`.
  - Usa o mesmo `params` da tela (período/empresa/filial).
  - Erro → `toast.error`.

### 3. Ajustes menores (sem retrabalho grande)
- Confirmar que o box da análise renderiza `narrativaStream` (markdown parcial) sem quebrar quando o texto termina no meio de um bloco — `react-markdown` já lida com isso.
- Manter alerta 612 e badges `oficial`/`gerencial`/`simulado` como estão.
- Formatação por unidade e drawer de auditoria: **sem mudanças** — já cobrem o contrato.

## Fora de escopo
- Reorganizar seções/cards (já batem com o layout sugerido).
- Novos filtros — período/empresa/filial já existem.
- Backend: já pronto e validado.

## Detalhes técnicos

**SSE parser (esboço):**
```ts
const resp = await fetch(url, { headers, signal });
if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
const reader = resp.body.getReader();
const dec = new TextDecoder();
let buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const blocks = buf.split("\n\n");
  buf = blocks.pop() ?? "";
  for (const block of blocks) {
    const ev = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataLine = block.match(/^data:\s*(.+)$/m)?.[1] ?? "{}";
    let data: any = {}; try { data = JSON.parse(dataLine); } catch {}
    if (ev === "meta")  onMeta?.(data);
    else if (ev === "delta") onDelta?.(String(data.text ?? ""));
    else if (ev === "done")  onDone?.(data);
    else if (ev === "erro")  onErro?.(String(data.erro ?? "Erro na análise."));
  }
}
```

**Excel download:** blob + `URL.createObjectURL` + click programático, revogando a URL no `finally`.

**Auth/base:** ambos endpoints reusam `getContabilBaseUrl()` + `erpApi.getToken()` + `ngrok-skip-browser-warning: true` já centralizados no `contabilApi.ts`.

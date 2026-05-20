## Diagnóstico

O frontend já implementa exatamente o que o seu prompt descreve:

| Requisito do prompt | Status atual no Lovable |
|---|---|
| Fazer `fetch` com `Authorization: Bearer` em vez de `<img src>` direto | ✅ `src/hooks/useAuthedBlobUrl.ts` faz fetch com token + `ngrok-skip-browser-warning` e gera `URL.createObjectURL` |
| Renderizar via blob URL (`<img>` JPG/PNG, `<iframe>` PDF) | ✅ `DrawingPage` em `src/components/producao/OpPrintSheet.tsx` |
| Aguardar todos desenhos carregarem antes de `window.print()` | ✅ `aguardarDesenhosProntos()` em `ImpressaoOrdemProducaoPage.tsx` (linhas 47–78) espera `<img>.complete`/`load` e `<iframe> load`, com timeout de 10s |
| CSS A4 `.op-drawing-page` / `.op-print-page` com `page-break-after` | ✅ presente em `op-print.css` |
| Mostrar "Nenhum desenho encontrado…" só no preview | ✅ `renderPreviewDesenhosResumo()` com `no-print` |

Não há ajuste pendente no Lovable para esse fluxo. O `useAuthedBlobUrl` já cobre o "ponto decisivo (#6)" do seu prompt.

## Onde está o problema, com alta probabilidade

Como a parte do frontend está correta, o motivo de "os desenhos não aparecerem" é **um destes dois lados da API**, exatamente como você listou:

1. **A API não está enxergando** `\\EZORTEA-SRVSENI\Senior\Sapiens\Pasta de Desenho\02-JPG_OP`
   → o endpoint `/api/producao/ordem-producao/impressao?...&incluir_desenhos=S` retorna `"desenhos": []`.
2. **A API retorna `desenhos[]` com `url` que dá 401/403/404** quando o frontend chama com Bearer
   → nesse caso veríamos `Falha ao carregar: HTTP xxx` no preview de cada desenho.

## Como confirmar em 2 minutos

1. Abra o DevTools → Network durante "Pré-visualizar" com `incluir_desenhos=S` e:
   - Veja a resposta de `/api/producao/ordem-producao/impressao` → o array `desenhos` está preenchido?
   - Se sim, veja a chamada `GET /api/producao/ordem-producao/desenho?arquivo=…` (vai aparecer com `Authorization: Bearer`) → status 200, 401 ou 404?
2. Em paralelo, no backend, criar o endpoint `/api/producao/ordem-producao/desenhos/diagnostico` que você descreveu e chamar:
   ```
   /api/producao/ordem-producao/desenhos/diagnostico?cod_emp=1&cod_ori=250&num_orp=1112
   ```
   Conferir `pasta_existe`, `qtd_arquivos_pasta`, `desenhos_encontrados`.

## Possíveis pequenas melhorias no frontend (opcionais)

Caso queira deixar o diagnóstico ainda mais transparente no Lovable, posso (se você aprovar este plano):

1. **Mostrar status por desenho no preview**: na tabela "Desenhos encontrados", adicionar uma coluna "Status" que reflita `loading` / `OK` / `Falha: <msg>` consumindo o estado do `useAuthedBlobUrl` por linha (via componente wrapper). Hoje o erro só aparece dentro da página A4 do próprio desenho.
2. **Botão "Testar diagnóstico"** ao lado do checkbox "Incluir desenhos", que chama `GET /api/producao/ordem-producao/desenhos/diagnostico?cod_emp&cod_ori&num_orp` e exibe um modal/JSON com `pasta_existe`, `qtd_arquivos_pasta`, `desenhos_encontrados`. Isso só funciona depois que você criar o endpoint no backend.
3. **Mensagem mais clara** quando `data.desenhos` vier preenchido mas todos os blobs falharem, do tipo: "A API listou N desenho(s) mas nenhum pôde ser baixado — verifique permissões/token do endpoint `/desenho`."

Fora isso, **não há nada para corrigir no Lovable** — o pacote do prompt #6 já está implementado.

## Resposta direta

- ✅ Lovable: já faz `fetch` com Bearer, gera blob URL, espera os desenhos antes do `window.print()`.
- ⏳ Próximo passo: aplicar os itens #1–#5 do seu plano no backend FastAPI (criar `/desenhos/diagnostico`, fixar `PASTA_DESENHOS_OP_PADRAO`, atualizar `localizar_desenhos_produto`, endpoint `/desenho` e injetar `desenhos` no `/impressao`).
- Depois, rodar o checklist (itens #7.1–#7.4) para isolar se é problema de pasta/SMB ou de token.

Me diga qual das três melhorias opcionais do frontend você quer e eu implemento — ou, se preferir, primeiro aplique os ajustes da API e voltamos aqui só se ainda houver problema visual no Lovable.

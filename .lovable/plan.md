

## Remover obrigatoriedade de OP e Origem na Auditoria Genius (Opção A)

### O que muda

**`src/pages/AuditoriaApontamentoGeniusPage.tsx`**
- Remover o bloqueio em `buscarAuditoriaApontamentoGenius` que faz `toast.error('Informe OP e Origem…')` e aborta. A consulta passa a sair sempre.
- Remover o guard `onClickCapture` no wrapper do `ExportButton`.
- Remover os asteriscos dos labels "Número da OP" e "Origem (GENIUS)".
- Manter `toIntOrUndef` nos builders: quando vazios, `numorp`/`codori` ficam `undefined` e são omitidos da URL pelo `api.get`.

**Sem mudanças em**
- `src/lib/api.ts` (já omite `undefined` por padrão).
- Testes (`AuditoriaApontamentoGeniusPage.contract.test.tsx`) — continuam válidos: vazios omitidos, preenchidos viram inteiros.

### Aviso importante
O backend atual ainda exige `numorp` e `codori` (`Field required`). Depois desta mudança, ao clicar Pesquisar sem preencher, a tela vai mostrar erro 422 legível (`numorp: Field required; codori: Field required`) — não mais `[object Object]`.

Para o cenário desejado (consulta ampla sem OP/Origem retornando 200 OK) funcionar de fato, **o backend FastAPI precisa tornar esses dois campos `Optional[int] = None`** em `/api/apontamentos-producao` e `/api/export/apontamentos-producao`, e ajustar o SQL para não filtrar quando ausentes. Essa parte é fora do Lovable e fica com você.

### Validação
1. Após ajuste do backend: abrir a tela, deixar vazios, Pesquisar → request sem `numorp`/`codori` → 200 OK com todos os apontamentos do período.
2. Preencher só OP `12345` → request com `numorp=12345` → 200 OK filtrado.
3. Exportar com vazios → Excel completo.
4. `npx vitest run` → verde.


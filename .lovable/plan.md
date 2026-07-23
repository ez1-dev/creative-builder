## Diagnóstico

O filtro **Cliente** em `/contas-receber` já usa o mesmo componente `AutocompleteAsync` do Fornecedor, apontando para `GET /api/cadastros/clientes?q=` (via `fetchClientesCadastro` em `src/hooks/useCadastrosErp.ts`). No frontend não há diferença estrutural entre Cliente e Fornecedor.

A lista aparece vazia porque **o endpoint `/api/cadastros/clientes` ainda não está respondendo no backend FastAPI** (o contrato dele já foi documentado em `docs/backend-cadastros-autocomplete.md` § 6, mas provavelmente não foi implantado). Como o hook engole erros e devolve `[]`, o combobox mostra "Nenhum resultado" em vez de mensagem clara.

## Verificação (1 passo)

1. Abrir DevTools → Network, abrir o combo Cliente e confirmar que `GET /api/cadastros/clientes?q=...` retorna 404/500/vazio. Se retornar 200 com array, o problema é outro (mapeamento de campos) e ajusto o `normalize`.

## Ações no frontend (leves)

1. **Pré-carregar a lista ao abrir o popover** (já faz — dispara busca sem `q`), mas exibir estado explícito quando o endpoint falha:
   - Em `src/hooks/useCadastrosErp.ts` → `fetchList`: distinguir "erro de rede/404" de "lista vazia" e propagar um flag `unavailable`.
   - Em `src/components/erp/AutocompleteAsync.tsx`: quando `unavailable`, mostrar "Cadastro indisponível — verifique o backend" no lugar de "Nenhum resultado".
2. **Fallback opcional**: quando `/api/cadastros/clientes` estiver indisponível, tentar extrair a lista de clientes da própria resposta de `/api/contas-receber` já carregada (usando `codigo_cliente` + `nome_cliente` das linhas em memória) — mesmo padrão do `useErpOptions` que já faz merge de opções de API + dados. Isso destrava o filtro imediatamente enquanto o backend não sobe.

## Ação no backend (bloqueante para lista completa)

Implantar o endpoint `GET /api/cadastros/clientes?q=` exatamente conforme `docs/backend-cadastros-autocomplete.md` § 6 (tabela `E085CLI`, retornando `codigo/descricao/label/fantasia`, `SitCli='A'` quando existir). O contrato já está pactuado — nada muda no frontend depois que subir.

## Detalhes técnicos

- Arquivos tocados: `src/hooks/useCadastrosErp.ts`, `src/components/erp/AutocompleteAsync.tsx`, `src/pages/ContasReceberPage.tsx` (passa `tableData` para o fallback).
- Nenhuma mudança em Fornecedor / Contas a Pagar.
- Sem migrações no Cloud.


## Trazer fornecedores do ERP no filtro do Painel de Compras

### Situação atual
Hoje a lista do combobox "Fornecedor" vem só dos resultados já carregados na tela (`data?.dados` → `fantasia_fornecedor`). Isso limita a busca: se o fornecedor não está na página atual, ele não aparece.

### O que muda

**1. Novo hook `src/hooks/useFornecedores.ts`**
- Carrega lista completa de fornecedores do ERP via `api.get('/api/fornecedores')` quando `erpReady === true`.
- Mapeia para `{ value: fantasia/nome, label: 'codigo - nome' }` (ajusto conforme campos reais retornados — provavelmente `codcli`/`nomcli`/`fantasia` ou `codigo`/`razao_social`/`fantasia`).
- Mescla com fornecedores presentes em `data.dados` (mesmo padrão do `useErpOptions`) para garantir que nada some caso o endpoint não exista.
- Trata 404/erro silenciosamente: se backend não tiver endpoint, mantém só os derivados dos resultados.
- Retorna `{ fornecedores, loading }`.

**2. `src/pages/PainelComprasPage.tsx`**
- Substituir o `useMemo` local de `fornecedoresOptions` pela chamada do novo hook.
- Passar `loading` para o `ComboboxFilter` (lupa vira spinner enquanto carrega).
- Mantém comportamento de digitar texto livre (busca parcial pelo backend continua funcionando porque o `value` enviado segue sendo string).

### Detalhes técnicos
- Antes de codar, vou checar se já existe rota `/api/fornecedores` (ou similar) sendo consumida em outras telas, e qual o formato dos campos. Se houver padrão na base, sigo o mesmo.
- Cache simples no hook (state) por sessão — uma chamada só ao montar o app a primeira vez que `erpReady` vira true.
- Sem mudança no contrato com a API de busca: o filtro continua mandando `fornecedor=<texto>` igual hoje.

### Validação
- Abrir `/painel-compras`, abrir o combobox Fornecedor → mostra spinner brevemente, depois lista todos os fornecedores do ERP ordenados.
- Digitar parte do nome → filtra na lista local (rápido, sem ir ao backend).
- Selecionar um fornecedor e Pesquisar → request normal com `fornecedor=...`.
- Se o endpoint não existir/falhar → cai no comportamento anterior (só fornecedores dos resultados), sem erro visível.

### Risco
- Se o backend não tiver endpoint `/api/fornecedores`, precisarei criar (fora do Lovable, no FastAPI). Nesse caso aviso e mantenho o fallback funcionando enquanto isso.


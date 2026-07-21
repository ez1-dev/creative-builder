## Contexto

Três correções na tela DRE Studio · Visualização. Item 1 (`.env`) já está aplicado (`VITE_CONTABIL_API_URL` e `VITE_API_BASE_URL` apontam para `https://api-erp-renato.ngrok.app`) — nada a fazer. Itens 2 e 3 precisam de ajuste no front.

## 2. "Atualizar Resultado" — garantir 100% fluxo assíncrono

Auditar `DreStudioVisualizacaoPage.tsx` e `src/hooks/contabil/api.ts` para confirmar que nenhum caminho ainda dispara `POST .../atualizar-cache` síncrono:

- `executarTudoAutomatico`, `handleAtualizarCacheSenior`, `handleCarregarAnoInteiro`, botões do stepper e auto-runner devem todos ir por `useMaterializarResultado` (job + polling), abrindo `MaterializacaoDialog`.
- Manter `useAtualizarCacheSenior` só como utilitário legado; se ainda houver referência de UI, remover.
- Payload de materialização deve sempre incluir `sincronizar_erp: true` e `recalcular: true`, além dos 5 parâmetros de chave (ver item 3).

## 3. Balanço/DRE zerado — alinhar parâmetros e tratar SEM_CACHE

Causa raiz: `expandir_resultado_exercicio` é derivado hardcoded em `DreStudioVisualizacaoPage.tsx` linhas 326-327 (`true` só quando Balanço + `MENSAL_E650SAL`, senão `false`), sem toggle na UI. Se existir um snapshot materializado com `expandir=true` para uma combinação onde o front calcula `false`, o `resultado-pronto` devolve `SEM_CACHE` e a grade renderiza zerada.

### 3.1 Toggle "Expandir resultado do exercício"

- Adicionar toggle na barra de filtros (persistido em `localStorage`, como `aplicarRefSenior`).
- Estado único: leitura (`useResultadoPronto`) e materialização (`useMaterializarResultado`) recebem o mesmo valor. Não deixar defaults divergirem entre hook de leitura e mutation.
- Toggle "Aplicar referência Senior" já existe; garantir que os 5 parâmetros de chave (`codfil`, `modo_balanco`, `aplicar_referencia_senior`, `expandir_resultado_exercicio`, `fonte_saldo`) saem idênticos em ambas as chamadas.

### 3.2 Unblock imediato do estado atual

Default do novo toggle deve iniciar **ligado** para o modelo/período em questão (Balanço `MENSAL_E650SAL`), para que a leitura encontre o snapshot já existente sem re-materializar. Manter o default anterior para os demais casos (compatível).

### 3.3 UX de SEM_CACHE

Hoje o stepper "Como gerar o resultado" só aparece quando `mostrarStepper = semContas || semCache` (linha 1423), mas a grade renderiza zerada por baixo. Ajustar:

- Quando `status === "SEM_CACHE"`, ocultar a matriz zerada e mostrar um bloco claro: "Resultado ainda não materializado para estes parâmetros — clique em **Gerar resultado**", com o botão `dispararMaterializacao()` em destaque e o stepper já existente logo abaixo.
- Mensagem deve listar os 5 parâmetros atuais para o usuário entender que a combinação importa.

## Arquivos afetados

- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — novo toggle, cálculo de `expandirREEfetivo`, tratamento de SEM_CACHE, auditoria de handlers síncronos.
- `src/hooks/contabil/api.ts` — confirmar assinatura consistente de `useResultadoPronto` × `useMaterializarResultado` para os 5 parâmetros.

## Fora de escopo

- Alterações no backend (já ajustado).
- `.env` (já corrigido).
- Reescrita do `MaterializacaoDialog` / polling (funcional).

## Pergunta

Confirma que o toggle "Expandir resultado do exercício" deve começar **ligado por padrão** para Balanço `MENSAL_E650SAL` (destrava o snapshot atual sem re-materializar)? Ou prefere que ele reflita o último valor usado por usuário, mesmo que isso obrigue re-materializar agora?

## Contexto

O backend ainda não publicou dois endpoints do DRE Studio:

- `POST /api/contabil/modelos/{id}/clonar-vinculos-oficial`
- `GET  /api/contabil/modelos/{id}/validar-vinculos`

Hoje, ao clicar em **Clonar vínculos** ou **Validar** na aba *Vínculos* de `/contabilidade/dre-studio/configuracoes`, o front chama a API, recebe 404, dispara toast de erro e ainda grava um registro em `error_logs` (Supabase) a cada tentativa — poluindo os logs e assustando o usuário.

O padrão já usado nas outras seções (Snapshots, Referência Senior, Agendamentos) é: detectar 404, marcar `unavailable: true`, exibir o banner `EndpointIndisponivel` e desabilitar as ações. Falta aplicar o mesmo tratamento a esses dois recursos.

## Objetivo

Tratar os dois endpoints como "indisponíveis" de forma silenciosa: sem toast de erro, sem gravar em `error_logs`, e com a UI já em estado degradado (banner + botões desabilitados) antes mesmo do usuário clicar.

## Mudanças

### 1. `src/lib/contabil/contabilApi.ts`
Não logar em `error_logs` quando o status é 404 (é uma resposta esperada, os hooks já convertem em `unavailable`). Manter o `throw` normal — só suprimir o `logError` para 404.

### 2. `src/hooks/contabil/configuracoes.ts`
- **`useClonarVinculosOficial`**: em vez de `throw new Error("...solicite ao backend...")` no 404, retornar `{ unavailable: true }`. Ajustar assinatura do retorno da mutation para `{ vinculos_clonados?: number; unavailable?: boolean }`. No `onSuccess`, se `unavailable` for true, não mostrar toast de sucesso.
- **Novo helper `useClonarVinculosDisponivel(modeloId)`**: probe leve via `useQuery` que faz um `HEAD`/`OPTIONS`... simplificar: reutilizar o próprio `useValidarVinculos` já retorna `unavailable` no 404. Como os dois endpoints costumam ser publicados juntos (mesmo módulo backend), usar o resultado do `validar-vinculos` (executado silenciosamente uma vez ao selecionar o modelo, com `enabled=true`) como sinal de disponibilidade também para `clonar-vinculos-oficial`.

### 3. `src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx` (aba Vínculos)
- Executar `useValidarVinculos` automaticamente ao selecionar o modelo (setar `enabled = !!modeloId`) para descobrir a disponibilidade sem exigir clique.
- Quando `validar.data?.unavailable === true`:
  - Manter/mostrar o banner `EndpointIndisponivel` já existente.
  - Mostrar também um segundo banner (ou ampliar o texto) informando que **Clonar vínculos** e **Validar vínculos** dependem de endpoints ainda não publicados no backend.
  - Desabilitar os botões dos `ActionCard` "Clonar do modelo oficial" e "Validar vínculos" com tooltip "Endpoint indisponível — solicite ao backend".
- Os cards "Vincular contas Senior (DRE/Balanço)" continuam funcionais.

### 4. Sem alterações em outras telas / hooks
Nada muda no fluxo de vínculos por E045PLA, cache, drills etc. — só a experiência dos dois endpoints ausentes.

## Detalhes técnicos

- `logError` fica condicional a `statusCode !== 404` em `contabilApi.ts`.
- O `unavailable` do `useClonarVinculosOficial` é derivado (não muda a estrutura da mutation existente para consumidores); a página só usa `disabled` a partir de `validar.data?.unavailable`.
- Não há mudança de contrato com o backend nem de tokens de design.

## Fora de escopo

- Publicar os endpoints (é do backend).
- Reescrever a aba Vínculos ou o motor de cache/drill.
- Alterar comportamento das outras abas.

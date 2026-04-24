

## Tornar OP e Origem obrigatórios na Auditoria Genius (contrato atual do backend)

### Diagnóstico
O backend mudou de novo. Agora exige:
- `numorp`: **obrigatório** + **inteiro**
- `codori`: **obrigatório** + **inteiro**

Erro atual: `numorp: Field required; codori: Field required` — porque o fix anterior omite os dois quando vazios (correto para o problema do `unable to parse string as an integer`, mas o backend agora exige presença).

Não dá para satisfazer os dois ao mesmo tempo enviando vazio: se mandar `""` quebra no parse int; se omitir, quebra em "field required". A única saída válida é **garantir que o usuário preencha OP e Origem antes de consultar**.

### O que muda

#### 1) `src/pages/AuditoriaApontamentoGeniusPage.tsx`

**Validação na UI:**
- Marcar visualmente os campos OP e Origem como obrigatórios (asterisco no label).
- No `handleConsultar` (ou equivalente que dispara `fetchData`), bloquear a chamada se `filters.numop` ou `filters.codori` estiverem vazios/não numéricos. Mostrar `toast.error('Informe OP e Origem (ambos numéricos) para consultar.')` e abortar.
- Mesmo bloqueio no clique do `ExportButton`: se faltar OP ou Origem, abrir toast e não disparar export. Implementar passando uma prop de validação ou envolvendo o botão num wrapper que checa antes.

**Builders (sem mudança estrutural):**
- `buildAuditoriaListParams` e `buildAuditoriaExportParams` continuam usando `toIntOrUndef`. Como agora a UI garante valor antes de chamar, `numorp` e `codori` sempre virão como inteiros válidos.
- Manter `AUDITORIA_KEEP_EMPTY = [] as const` (contrato continua "envia integer ou nada", e nunca mais "nada" na prática).

**Estado inicial:**
- Não pré-preencher OP/Origem com nada. Consulta automática inicial (se houver `useEffect` que dispara `fetchData` no mount) precisa ser **removida ou condicionada** à presença dos dois campos. Senão a tela já abre com 422.

#### 2) `src/pages/__tests__/AuditoriaApontamentoGeniusPage.contract.test.tsx`

- Adicionar caso: com `numop='12345'` e `codori='110'` preenchidos, `buildAuditoriaListParams` retorna `numorp: 12345` e `codori: 110` como inteiros (já existe — manter).
- Manter teste que verifica omissão quando vazios (continua válido para o builder; a barreira de obrigatoriedade fica na UI, não no builder puro).

#### 3) Sem mudanças em
- `src/lib/api.ts`
- `src/components/erp/ExportButton.tsx` (a validação fica na página, não no botão genérico)

### Validação manual
1. Abrir `/auditoria-apontamento-genius` → tela carrega vazia, **sem disparar request automático**.
2. Clicar Consultar sem preencher → toast "Informe OP e Origem…", nenhuma request sai.
3. Preencher OP `12345` e Origem `110` → request `/api/apontamentos-producao?...&numorp=12345&codori=110` → 200 OK.
4. Clicar Exportar sem preencher → toast, sem request.
5. Preencher e exportar → `/api/export/apontamentos-producao?...&numorp=12345&codori=110` → 200 OK.
6. `npx vitest run` → todos os testes passam.

### Fora de escopo
- Backend (já está como está; estamos nos adequando).
- Tornar OP/Origem opcionais no backend (decisão de produto, não de frontend).

### Observação
Se a intenção real é permitir consulta sem OP/Origem (modo "varredura ampla"), isso precisa ser **mudança no backend** — não há como o frontend resolver isso sozinho, pois `Field required` é validação server-side. Confirme se quer que eu siga o plano acima (UI obriga preenchimento) ou se prefere que eu apenas reporte e você ajuste o backend.


## Objetivo

Permitir impressão em massa de OPs **com desenhos** sem estourar o navegador. Hoje a impressão em lote chama `/api/producao/ordem-producao/impressao/lote`, baixa cada desenho A4 página a página via `useDesenhosA4` e renderiza tudo no React antes de `window.print()`. Acima de algumas dezenas de OPs com desenhos, isso trava o navegador.

A solução é mover a geração do PDF completo (cabeçalho + componentes + operações + desenhos A4 já normalizados) para o backend, via job assíncrono, e o frontend apenas dispara, faz polling e baixa.

## Mudanças no frontend

**Arquivos afetados**
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (UI + orquestração do job)
- `src/lib/producao/opImpressaoPdfJob.ts` (novo — wrapper das 3 rotas do job)
- `src/hooks/useImpressaoPdfJob.ts` (novo — estado do job + polling)

### 1. Novo módulo `opImpressaoPdfJob.ts`

Expor:
- `criarPdfJob({ ops, incluir_desenhos, incluir_componentes, incluir_operacoes }) → { job_id }`  
  → `POST /api/producao/ordem-producao/impressao/pdf-job`
- `consultarPdfJob(jobId) → { status, progresso?, mensagem?, erro?, quantidade_ops?, tamanho_bytes? }`  
  → `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/status`
- `urlDownloadPdfJob(jobId)` → string usada por `<a download>` / `window.open` chamando `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/download` (com headers de auth já tratados pelo `api`).

`ops[]` montado a partir de `lote.ordens` mapeando `{ codemp: Number(cab.cod_emp), codori: String(cab.cod_ori), numorp: Number(cab.num_orp) }`. Sem limite de quantidade — não truncar a lista.

### 2. Novo hook `useImpressaoPdfJob`

Estados: `status: 'IDLE' | 'CRIANDO' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'`, `jobId`, `progresso`, `mensagem`, `erro`, `downloadUrl`.

Comportamento:
- `iniciar(payload)` → cria job, guarda `job_id`, vai para `PROCESSANDO` e dispara polling.
- Polling a cada **3s** via `setInterval`, cancelável (cleanup no unmount e ao reiniciar).
- Ao receber `status = "CONCLUIDO"` → para o polling, vai para `CONCLUIDO`, define `downloadUrl`.
- Ao receber `status = "ERRO"` (ou erro HTTP) → para o polling, vai para `ERRO`, guarda mensagem; mostrar `toast.error`.
- `cancelar()` para resetar estado (não cancela no backend nessa fase).

### 3. UI em `ImpressaoOrdemProducaoPage.tsx`

Na **barra de ações do lote** (perto de "Imprimir todas" / "Imprimir visualização"), adicionar:

- Botão primário **"Gerar PDF completo com desenhos"**  
  - Habilitado quando `lote?.ordens?.length > 0`.  
  - Ao clicar: chama `iniciar` passando todas as `ops` selecionadas + flags atuais:
    - `incluir_desenhos: filtros.incluir_desenhos === "S"`
    - `incluir_componentes: filtros.listar_componentes === "S"`
    - `incluir_operacoes: true` (a tela sempre lista operações hoje)
- Enquanto `status` ∈ {CRIANDO, PROCESSANDO}: substituir o botão por um bloco com `Loader2` + texto **"Gerando PDF completo com desenhos. Aguarde…"** (e progresso/mensagem do backend quando vier). Demais botões de impressão em massa ficam desabilitados.
- Quando `status === "CONCLUIDO"`: mostrar botão **"Baixar PDF"** (variant `default`, ícone `Download`) que abre `downloadUrl` em nova aba; manter um botão secundário "Gerar novo" que reseta o estado.
- Quando `status === "ERRO"`: `Alert` com a mensagem do backend e botão "Tentar novamente".

A versão para uma única OP (`Imprimir`) e a "Imprimir visualização" continuam usando `window.print()` como hoje — sem mudança. A visualização paginada em tela permanece igual; a geração completa **não** renderiza todas as OPs no React.

### 4. Limites e ajustes correlatos

- Remover qualquer truncamento implícito da seleção para o novo fluxo (revisar `imprimirTodas` / construção do payload do lote — manter o limite atual apenas para a impressão via navegador; o job aceita lista completa).
- `useDesenhosA4` continua usado **apenas** para a visualização em tela / impressão via navegador. O job não usa esse hook.

## Contrato esperado do backend (documentar)

Criar `docs/backend-impressao-op-pdf-job.md` descrevendo:

- `POST /api/producao/ordem-producao/impressao/pdf-job`  
  Body:  
  ```json
  {
    "ops": [{ "codemp": 1, "codori": "240", "numorp": 10171 }],
    "incluir_desenhos": true,
    "incluir_componentes": true,
    "incluir_operacoes": true
  }
  ```  
  Resposta `202`: `{ "job_id": "..." }`.

- `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/status`  
  Resposta:  
  ```json
  {
    "job_id": "...",
    "status": "PENDENTE | PROCESSANDO | CONCLUIDO | ERRO",
    "progresso": 0.42,
    "mensagem": "Processando OP 12 de 30",
    "erro": null,
    "quantidade_ops": 30,
    "tamanho_bytes": 1234567
  }
  ```

- `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/download`  
  `application/pdf` com PDF final já contendo capas + componentes + operações + desenhos A4 retrato (mesma normalização de `/desenho/impressao-a4`). Frontend nunca chama `/desenho/impressao-a4/pagina` para esse fluxo.

## Fora de escopo

- Implementação backend do job (FastAPI) — apenas documentar contrato.
- Alterar visualização em tela / impressão de uma única OP.
- Persistir histórico de jobs ou cancelamento server-side.

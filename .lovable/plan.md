## Status: já implementado

Verifiquei o código atual do módulo RH · Resumo da Folha (`src/pages/rh/ResumoFolhaPage.tsx`, `src/components/rh/ResumoFolhaDrillDrawer.tsx`, `src/lib/rh/api.ts`, `src/lib/rh/types.ts`). Os três itens do prompt já foram entregues em turnos anteriores desta conversa:

### 1. Card "Vale Alimentação" — REMOVIDO
- Cards são renderizados a partir de `dashboard.drills_menu` (linhas 120-173 de `ResumoFolhaPage.tsx`). Sem entrada `va` no menu, o card some sozinho.
- `kpis.va` continua no tipo (`types.ts:285`) e no normalizador (`api.ts:195`), sem virar card.
- Tooltip de **Benefícios** já traz "inclui V.A." (linha 482).
- Observação: `va` ainda aparece como **coluna do grid por filial** (linha 400 do `FILIAL_COLS`), o que é correto — o prompt fala apenas em remover o *card*.

### 2. Card "INSS Patronal" — ADICIONADO
- Linha 484: `<KpiOrMissing title="INSS Patronal" value={kpis?.inss_patronal} ...>` ao lado de **INSS (empregado)** (linha 483), lado a lado como sugerido.
- `kpis.inss_patronal` mapeado em `api.ts:228` e tipado em `types.ts:276`.
- Tooltip: "Encargo patronal do INSS (~20% da base). Custo da empresa, não desconto do empregado."

### 3. Drills até o último nível
- **Fonte dos agrupamentos**: `drillsMenu` vem do dashboard e é passado para o drawer via `openDrill` — não há lista hardcoded; Salário Base recebe automaticamente só `colaborador/filial/mes`.
- **7 níveis**: `DEEP_LEVELS = {evento_colaborador, colaborador_evento, analitico}` em `ResumoFolhaDrillDrawer.tsx:56`; rótulos amigáveis no dicionário da linha 53.
- **Analítico**: colunas **Colaborador · Evento · Qtd. referência · Valor** (branch `richMode === "analitico"`, linhas 282+ e 324+).
- **`limite=5000`** enviado nos níveis profundos (`drawer` monta `params` com limite alto quando `DEEP_LEVELS.has(tab)`).
- **Timeout de 30s** no drill: `api.get(..., { timeoutMs: 30_000 })` em `api.ts:400`.
- **Erro/timeout**: bloco de erro com botão **"Tentar novamente"** no drawer (não fica em skeleton infinito).
- **Badge "Validado FPRF001"** no header (linha 872) + nota metodológica no rodapé do analítico (linha 415+).

## Fora de escopo (nada a mudar)
- Sem alterações de cálculo/endpoint.
- Sem tocar em backend FastAPI.

Se você viu comportamento diferente na tela (ex.: card VA ainda aparecendo, INSS Patronal ausente, drill em skeleton), me diga qual card/nível/período e eu investigo — pode ser cache do navegador ou API antiga antes do restart.
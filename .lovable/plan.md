## Objetivo

Adicionar um bloco de **Análise IA** na página `/monitor-telas` que, sob demanda, lê os dados carregados da aba ativa (Portal Web ou ERP Nativo) e devolve **diagnóstico, riscos e recomendações de melhoria**, usando como referência a **documentação oficial do Senior (TDN / Central de Ajuda)**.

## UX

- Novo card **"Análise IA"** logo abaixo dos filtros, dentro de cada aba (`MonitorTelasTab`).
- Estado inicial: card recolhido com botão **"Analisar com IA"** + descrição curta.
- Ao clicar: chama a edge function, mostra skeleton, depois 3 seções:
  - **Diagnóstico** — leitura factual do uso das telas no período.
  - **Riscos** — telas críticas sem uso, concentração em poucos usuários, ausência de módulos esperados, quedas bruscas em `por-dia`, etc.
  - **Recomendações** — ações concretas (treinamento, revisão de permissão, desativação, revisar regra `GER-000CONCX01` no caso do ERP Nativo, publicar tela nova no menu, revisar consultas SQL Senior, etc.).
- Cada bullet ≤ 220 caracteres. Botão **"Gerar novamente"** e timestamp `Gerado em …`.
- Erros tratados igual às tabelas (429 = limite, 402 = créditos, 500 = falha).

## Arquitetura

**Nova edge function:** `supabase/functions/monitor-telas-ia/index.ts`

- Baseada no padrão de `rh-ai-insights` (mesmo gateway Lovable AI, mesmo modelo `google/gemini-3-flash-preview`, mesmo esquema de `tool_call` com `diagnostico`, `riscos`, `recomendacoes`).
- Entrada:
  ```json
  {
    "origem": "web" | "nativo",
    "filtros": { "dias": 30, "modulo": "", "usuario_filtro": "" },
    "payload": {
      "resumo": {...},
      "por_dia": [...],   // enviado inteiro (curto)
      "ranking_top": [...],   // top 25
      "ranking_bottom": [...], // bottom 10 do ranking (ou mais frequentes com baixo uso)
      "nao_utilizadas": [...]  // top 25 mais críticas
    }
  }
  ```
- Sistema prompt com **contexto Senior** curado (não faz fetch em runtime — evita latência e falha de rede):
  - Fontes citáveis: **Central de Ajuda Senior (`https://centraldeajuda.senior.com.br`)**, **TDN Senior (`https://tdn.totvs.com/display/public/SENIOR`)**, documentação **Senior X Platform**, e regras nativas `GER-000CONCX01` (telemetria nativa).
  - Instrução: "cite a fonte por nome (Central de Ajuda Senior / TDN Senior / Senior X Platform) quando fizer sentido; não fabrique URLs".
- Foco por origem:
  - **web** → adoção do Portal, telas mais/menos usadas, dispersão por usuário, oportunidade de treinamento, permissões, cobertura de módulos.
  - **nativo** → dependência da regra `GER-000CONCX01`, cobertura de processos Senior, telas legado com alto uso que podem migrar para o Portal, monitoramento de processos críticos.

**Frontend:**

- `src/lib/monitorTelasIaApi.ts` (novo) — cliente que chama a function via `supabase.functions.invoke('monitor-telas-ia', { body })`; tipos `AnaliseIaResultado = { diagnostico, riscos, recomendacoes, gerado_em }`.
- `src/components/monitor-telas/AnaliseIaCard.tsx` (novo) — card com botão gerar, estados loading/erro, três seções (usar `Badge`/ícones lucide `Lightbulb`, `AlertTriangle`, `Stethoscope`).
- `src/components/monitor-telas/MonitorTelasTab.tsx` — injeta `<AnaliseIaCard>` recebendo `{ origem, filtros, resumo, porDia, ranking, naoUtilizadas }` (usa dados já carregados; não faz refetch).

## Regras de dados

- Se todos os blocos da aba estiverem vazios, o botão fica desabilitado com tooltip "Sem dados no período".
- Nunca enviar mais que ~15 KB de payload (trunca listas para top-N).
- Nunca chamar a IA automaticamente — sempre sob clique do usuário (custo controlado).

## Fora de escopo

- Live fetch dos sites Senior (evita CORS/latência; o modelo cita as fontes por nome).
- Persistência do resultado em banco. É gerado sob demanda.
- Nenhuma mudança no shell da página, filtros ou nas outras tabelas.

## Critérios de aceite

1. Cada aba mostra o card "Análise IA".
2. O clique chama `monitor-telas-ia` com o payload da aba ativa e os filtros aplicados.
3. Resultado exibe diagnóstico, riscos e recomendações em bullets.
4. Recomendações citam a documentação Senior (Central de Ajuda / TDN / regra `GER-000CONCX01`) quando aplicável.
5. Erros 401/402/429/500 exibem mensagem amigável.
6. Nenhum refetch das APIs de telemetria é disparado pela análise.

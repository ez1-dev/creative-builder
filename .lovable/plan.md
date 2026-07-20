
## Objetivo

Quando não houver resultado materializado para o período (status `SEM_CACHE` ou modelo sem linhas), a tela `DreStudioVisualizacaoPage` deve exibir um **guia visual numerado** ensinando ao usuário a sequência correta de ações — e destacar (halo/pulse) o botão da etapa atual na barra de ações.

## O que muda

Trocar o aviso amarelo curto de "Gerar resultado" por um **card de onboarding** com 4 passos numerados, cada um mostrando: o que faz, quando é necessário, e um botão que executa a ação daquele passo. Os botões existentes na barra "Dados / Saída" continuam funcionando iguais — o card apenas orienta a ordem.

### Ordem oficial (DRE e Balanço)

```text
1. Vincular contas          → só na 1ª vez ou quando o plano Senior mudou
   (usa: Vincular contas / Vincular contas automaticamente)
   Pode levar até 1 minuto.

2. Atualizar cache Senior   → traz os saldos mais recentes do ERP p/ o período
   (usa: Atualizar cache Senior)

3. Gerar resultado          → materializa o snapshot da DRE/Balanço
   (usa: Gerar resultado / Recalcular)

4. Conferir / Exportar      → grid carregada; usar Exportar, Histórico,
                              Editar estrutura conforme necessidade.
```

## Como fica na tela

- **Card "Como gerar o resultado"** aparece no topo do conteúdo sempre que:
  - `q.meta?.status === "SEM_CACHE"`, **ou**
  - o modelo não tem linhas vinculadas ainda (reaproveita as flags já usadas nos blocos das linhas 1360-1440).
- Layout: 4 mini-cards horizontais numerados (`1 → 2 → 3 → 4`) com ícone, título, 1 linha de descrição, e um botão pequeno "Executar este passo".
- **Passo atual destacado** (ring azul + leve pulse). Regra simples:
  - sem vínculos → passo 1
  - com vínculos e sem cache Senior recente (nunca atualizado no período) → passo 2
  - com cache Senior e sem materialização → passo 3
  - materializado → passo 4 (card colapsa em uma linha "Tudo pronto ✓ — próximas ações abaixo")
- Cada botão dispara exatamente o mesmo handler já existente (`vincular.mutate`, `atualizarCacheSenior.mutate`, `handleGerarResultado`) — nada de lógica nova de backend.
- Ao concluir todos os passos, o card some automaticamente na próxima renderização.

## Detalhes técnicos

- Arquivo único: `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`.
- Novo componente local `PassoAPassoResultado` (mesmo arquivo, sem export) recebendo os handlers, estados `isPending` e o "passo atual" calculado.
- Remove o bloco atual de `status === "SEM_CACHE"` (linhas 1774-1791) e os dois blocos "Vincular contas automaticamente" (1360-1440) — todos passam a viver dentro do novo card, evitando duplicidade.
- Botões da barra "Dados / Saída" permanecem intactos; apenas ganham `data-step="1|2|3"` para (opcionalmente) receber o mesmo ring quando forem o passo atual (via classe condicional).
- Copy sugerida por passo:
  1. **Vincular contas** — "Lê o plano Senior e cria as linhas analíticas do modelo. Faça só na primeira vez ou quando o plano mudar."
  2. **Atualizar cache Senior** — "Traz os saldos mais recentes do ERP para o período selecionado."
  3. **Gerar resultado** — "Materializa o snapshot da DRE/Balanço para consulta rápida."
  4. **Conferir e exportar** — "Use Exportar, Histórico ou Editar estrutura conforme necessidade."

## Fora do escopo

- Nenhuma alteração em hooks, API, cache, backend ou lógica de negócio.
- Sem mudança nos textos/labels dos botões da barra de ações.
- Sem alteração na página de Configurações do DRE Studio.

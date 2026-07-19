## Objetivo
Reformular a UX da página `/requisicoes/nova-op` (`NovaRequisicaoOpPage.tsx`) para um fluxo operacional guiado por etapas, preservando toda a lógica atual — hooks (`useOpConsulta`, `useSidWriteEnabled`, `useOpcoesImpressaoOp`), serviços (`requisicoesApi`), permissões, layout do ERP, autenticação, tema e componentes já existentes.

## Escopo
Apenas apresentação/UX. Não altera:
- endpoints, contratos ou payloads;
- cálculos (`quantidade_disponivel` continua vindo da API);
- rotas ou navegação global;
- outras páginas do módulo (`NovaRequisicaoAvulsaPage`, `RequisicoesListPage`, etc.).

## Mudanças

### 1. Container e layout
- Envolver o conteúdo em wrapper `max-w-[1200px] mx-auto`.
- Desktop: grid de 2 colunas `1fr 320px` — coluna principal + **resumo lateral fixo (sticky)**.
- Tablet/Mobile: resumo colapsa para bloco inferior; em mobile as ações principais viram barra fixa no rodapé (`sticky bottom-0`).

### 2. Stepper de 4 etapas (novo componente local `RequisicaoStepper`)
Passos: `1. Selecionar OP` → `2. Selecionar componentes` → `3. Definir atendimento` → `4. Revisar e enviar`.
- Estado local `step: 1|2|3|4`.
- Progressão condicionada:
  - 1→2: `op.data && podeRequisitar`.
  - 2→3: `itensSelecionados.length > 0` e todas justificativas de excesso preenchidas.
  - 3→4: `tipo` definido; se `TRANSFERIR`, `depositoDestino` preenchido.
- Steps concluídos ficam clicáveis para voltar; futuros ficam desabilitados.

### 3. Alerta de integração compacto
- Substituir os dois `IntegracaoOfflineBanner` por uma faixa fina de 1 linha:
  > "Integração com o Senior temporariamente desabilitada. Consultas continuam disponíveis e a requisição pode ser salva como rascunho."
- Botão `Ver detalhes técnicos` visível apenas quando `useIsAdmin()` (hook já existente no projeto — verificar; se não existir, usar checagem já usada em outras páginas como `useAuth`/perfil). Abre `Dialog` com o conteúdo técnico do `IntegracaoOfflineBanner` original (wsdl_ok, endpoints, etc.).
- Mostrar apenas quando `!sidWrite.enabled` ou `pendenteIntegr`.

### 4. Etapa 1 — Selecionar OP (com abas)
Card único com `Tabs`:
- **Aba "Buscar OP"** (default): único campo `OpAutocomplete` com placeholder "Buscar por número da OP, produto ou descrição". Cada item do dropdown já existe — apenas garantir exibição de origem/número/produto/descrição/situação/projeto/qtd prevista (usar `OpcaoOp` disponível; se algum campo não vier, ocultar graciosamente).
- **Aba "Informar manualmente"**: 2 inputs rotulados `Origem da OP` e `Número da OP` (nomes técnicos `CODORI`/`NUMORP` apenas em `Tooltip` visível para admin) + botão `Buscar OP`.
- Botão `Buscar OP`:
  - `disabled` quando campos vazios ou `op.isFetching`;
  - loading state `Consultando…`;
  - em erro, muda para `Tentar novamente`;
  - proteção de duplo clique via `disabled` durante fetch.
- Skeleton do card de resumo enquanto `op.isLoading`.

### 5. Etapa 1.5 — Card resumo da OP
Após consulta bem-sucedida, mostrar card compacto (não mais grid espalhado):
- Cabeçalho: `OP {codori}/{numorp}` + badge de situação.
- Grid 3 colunas com: produto final, descrição, derivação, projeto/obra, prevista, produzida, **saldo (prevista − produzida)**, data prevista (se existir no payload), centro de custo (se existir).
- Ações: `Trocar OP` (volta para etapa 1 limpando estado) e `Atualizar dados` (`op.refetch()`).
- Se `!podeRequisitar`: banner destrutivo compacto com `motivo_bloqueio` e bloqueio de avanço.

### 6. Etapa 2 — Tabela de componentes
Preservar todas as colunas atuais e adicionar:
- Toolbar acima da tabela:
  - busca por produto (filtro client-side em `codcmp`/`descricao`);
  - toggles: `Somente pendentes` (qtdreq < prevista), `Com saldo` (`quantidade_disponivel > 0`), `Sem saldo` (`quantidade_disponivel <= 0`) — mutuamente exclusivos entre "com/sem";
  - checkbox de seleção em massa no header (usa `quantidade_disponivel` como default).
- Cabeçalho fixo (`sticky top-0` dentro do container com altura máxima e scroll interno).
- Indicadores visuais por linha (via classe na primeira célula/borda esquerda colorida):
  - verde: `qtd <= disponivel && disponivel > 0`;
  - amarelo: `disponivel > 0 && disponivel < qtd_pendente`;
  - vermelho: `disponivel <= 0`;
  - azul: linha selecionada (`qtd > 0`);
  - cinza: já totalmente atendido (`qtd_utilizada >= qtd_prevista`).
- Ao exceder disponível: destaque no input + campo de justificativa obrigatório (já existe) + micro-texto "Necessária aprovação".
- Coluna "Observação" por item (novo estado local `obs: Record<number,string>`) — enviada em `payload.itens[].observacao` (campo opcional; se backend ignorar, sem efeito colateral).
- Paginação simples client-side de 25 itens quando `componentes.length > 25`.

### 7. Etapa 3 — Tipo de atendimento
Cards de opção (radio visuais) lado a lado:
- **Transferir para depósito produtivo**: mostra depósito origem (do primeiro item selecionado), input `Depósito de destino`, resumo de saldo total, campo `Observação`. Texto: "O material será transferido para o depósito produtivo. O consumo da OP ocorrerá posteriormente."
- **Baixar diretamente na OP**: mostra depósito origem, estágio(s), qtd totais. Texto: "O material será consumido diretamente pela Ordem de Produção." (campos de lote/série exibidos apenas se `comp.lote_obrigatorio` existir; caso contrário ocultos — sem novo backend).

### 8. Etapa 4 — Revisão
Lista fixa com:
- OP + situação;
- tabela reduzida (componente, qtd, depósito origem/destino, justificativa);
- tipo de atendimento;
- data necessária (novo input opcional local `dataNecessaria` enviado como `data_necessaria` no payload, se aceito);
- badge situação da integração.
Ações: `Voltar`, `Salvar rascunho`, `Enviar requisição`.

### 9. Resumo lateral fixo (novo componente local `ResumoRequisicaoLateral`)
Sticky na coluna direita a partir da etapa 2:
- OP selecionada; qtd itens; qtd total; itens com/sem saldo; itens acima da necessidade; tipo de atendimento; depósito destino; situação da integração (chip).
- Ações contextuais por etapa: etapa 2/3 → `Salvar rascunho | Cancelar | Continuar`; etapa 4 → `Voltar | Salvar rascunho | Enviar requisição`.
- Em mobile, renderiza abaixo do conteúdo e as ações principais viram barra fixa no rodapé.

### 10. Integração desabilitada
- Todas as etapas de consulta/preparo funcionam normalmente.
- `Enviar requisição` fica desabilitado (tooltip já existente via `sidWrite.reason`).
- `Salvar rascunho` chama apenas `requisicoesApi.criar(payload)` (sem `.enviar()`) e mostra toast "Salva como pendente de integração".
- Nunca chamar `enviar()` quando `!sidWrite.enabled`.

### 11. Histórico (etapa 4 e pós-envio)
- Na revisão, exibe resumo textual do que será registrado (usuário atual via hook de auth existente, data/hora, itens, justificativas).
- Após envio bem-sucedido, redirect atual para `/requisicoes/:id` é preservado — a página de detalhe já mostra histórico.

### 12. Detalhes visuais
- Sem gradientes decorativos; bordas discretas (`border` + `shadow-sm`); badges (`Badge` shadcn) para situação/integração; ícones lucide objetivos (`Search`, `RefreshCw`, `PackageSearch`, `Truck`, `Boxes`, `Send`, `Save`, `ArrowLeft`, `AlertTriangle`).
- Cores exclusivamente via tokens semânticos + tons já usados no projeto (emerald/amber/destructive) — sem hex hardcoded.
- Tabela: densidade média, `text-sm`, header `uppercase text-xs tracking-wide bg-muted/50`.

## Arquivos afetados
- **Modificado**: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (reescrita da UI mantendo hooks/payload).
- **Novos (locais ao módulo)**:
  - `src/components/requisicoes/RequisicaoStepper.tsx`
  - `src/components/requisicoes/IntegracaoStatusChip.tsx` (chip compacto + dialog admin)
  - `src/components/requisicoes/ResumoRequisicaoLateral.tsx`

Nenhum outro arquivo é tocado. Serviços, tipos, hooks e endpoints permanecem exatamente como estão.

## Critérios de aceite mapeados
Stepper de 4 etapas ✓ · Alerta compacto ✓ · Detalhes técnicos gated por admin ✓ · Busca dividida em abas ✓ · Sem campos duplicados ✓ · Conteúdo centralizado 1200px ✓ · Card-resumo da OP ✓ · Grade com filtros ✓ · `quantidade_disponivel` da API ✓ · Seleção + quantidades ✓ · Resumo fixo ✓ · Validações no Continuar ✓ · Envio bloqueado sem SID ✓ · Salvar rascunho disponível ✓ · Sem SOAP no navegador ✓.

## Objetivo

Refatorar `src/pages/bi/contabilidade/DrePage.tsx` para consumir a API contábil unificada (`https://dreconfiguravel.ngrok.app`) usando o novo payload materializado (`linhas[].valores["AAAAMM"].{realizado, orcado}`), remover recalculos no frontend, exibir metadados de sincronização/materialização, sinalizar dados incompletos, separar ações administrativas e adicionar a aba "Conciliação BI".

## Escopo (só frontend; nenhum backend/CORS/JWT)

### 1. URL centralizada
- Adicionar `VITE_DRE_API_URL` em `.env` (default `https://dreconfiguravel.ngrok.app`).
- Já existe `getContabilBaseUrl()` em `src/lib/contabil/contabilApi.ts` — garantir que ela leia `import.meta.env.VITE_DRE_API_URL` antes do fallback atual, e usá-la em `DrePage.tsx` (substituindo `getApiUrl()` da ERP principal). Nenhum componente terá URL fixa.
- Remover qualquer referência residual à porta 8090 nos módulos DRE.

### 2. Novo client de matriz
- Criar `src/lib/contabil/dreMatrizApi.ts` com:
  - `fetchDreMatriz({ ano, mes_ini, mes_fim, unidade, modelo_id? })` → chama `GET {DRE_API}/api/contabil/dre/matriz` via `contabilApiFetch`, retorna `{ linhas, meta }` normalizado.
  - Tipos: `DreLinhaApi { descricao, codigo_linha?, tipo_linha?, valores: Record<AAAAMM, { realizado, orcado, completo?, suspeito?, motivo_suspeita? }> }` e `DreMatrizMeta { fonte_saldo, periodo, ultima_sincronizacao, ultima_materializacao, status, modelo_id, modelo_nome, meses_incompletos[] }`.
  - Sem cálculo local: apenas conversão numérica segura e passthrough.
- Criar `src/lib/contabil/dreConciliacaoBiApi.ts` com `fetchConciliacaoBi(params)` retornando linhas `{ linha, mes, valor_app, valor_bi, diferenca, diferenca_pct, status }` (tolerância R$1,00 vinda do backend).

### 3. Refatorar `DrePage.tsx`
- Substituir shape antigo (`total_realizado`, `jan_realizado`, `jan_av`…) pelo novo `valores["AAAAMM"]`.
- Meses da matriz: gerar chaves `AAAAMM` a partir de `ano+mes_ini..mes_fim`; label via `anomesToLabel`.
- **Sem recálculo**: Receita Líquida, Custo Total, Lucro Bruto, EBITDA, EBIT, Resultado do Exercício, totais anuais e sinais vêm do backend. Se o backend não enviar a linha totalizadora, exibir "—", nunca somar no frontend.
- **A.V.** (única conta permitida no frontend, puramente visual): `realizado_linha / realizado_receita_bruta_do_mes * 100`; se receita = 0 → `"0,00%"`; nunca `NaN`/`Infinity`. Linhas negativas: percentual entre parênteses (mantém padrão atual).
- Coluna TOTAL só é renderizada se o backend enviar chave `TOTAL_ANO` (ou equivalente) em `valores`.

### 4. Faixa de metadados
- Novo componente `src/components/contabil/DreMetaBar.tsx` acima da matriz mostrando: Fonte, Período, Última sincronização, Último cálculo, Status API (via `useDreApiHealth`), Status fechamento (do `meta`), Modelo DRE. Todos os campos vêm do `meta` — o frontend **não** assume fonte.
- Badge "Fonte ativa: E640RAT/E650SAL" + aviso quando `meta.fonte_temporaria === true`.

### 5. Sinalização de dados incompletos
- Banner topo quando qualquer mês tem `completo === false` ou `materializacao < sincronizacao` ou `sync_status === 'erro'` ou `conciliacao_divergente === true`:
  > "Atenção: existem competências com dados possivelmente incompletos. Verifique a última sincronização antes de validar os resultados."
- Células com `suspeito === true`: ícone de alerta + tooltip com `motivo_suspeita`.
- Nunca exibir zero silencioso: se `valor == null` mostrar "—".

### 6. Estados
- Estados exclusivos (não sobrepor cache silenciosamente): `carregando`, `api_offline`, `banco_offline` (via `describeDreError`), `nao_materializado` (flag do backend), `desatualizado` (materialização < sync), `ok`. Cada um com mensagem exigida na spec. Ao trocar de filtro, o payload antigo é marcado como "cache" e exibido com faixa "Dados em cache — recarregando…" em vez de silencioso.

### 7. Ações separadas
- Substituir o botão único "Atualizar" por três:
  - **Atualizar tela**: re-fetch da matriz + meta, limpa cache local do React Query, sem tocar no ERP.
  - **Sincronizar ERP**: requer permissão + confirmação (`AlertDialog`); chama endpoint do backend.
  - **Recalcular DRE**: idem, endpoint separado.
- Gate por `useUserPermissions` (permissão administrativa contábil). Sem permissão, botões desabilitados com tooltip.

### 8. Cards
- Renderizar somente cards cujas linhas vieram no payload; nomes = `linha.descricao` exata do backend.
- Renomear card "Lucro Líquido" → "Resultado do Exercício" (linha `RESULTADO_EXERCICIO`) enquanto IRPJ/CSLL não estiverem confirmados.
- Valores dos cards = `linha.valores[TOTAL_ANO].realizado` (ou soma feita no backend). Nunca somar no frontend.

### 9. Aba "Conciliação BI"
- Envolver conteúdo em `Tabs`: **DRE** (matriz atual) e **Conciliação BI** (nova).
- Nova tab: tabela com Linha DRE | Mês | Valor Aplicação | Valor BI | Diferença | % | Status (badge colorido: Conciliado / Diferença de arredondamento / Divergente / Sem correspondência / Mês incompleto). Sem parsing de XLS no frontend.

### 10. Drill-down
- Manter `DreDrillDrawer`, mas apontá-lo para o endpoint do backend contábil unificado. Painel exibe exatamente os campos retornados pela API (competência, empresa, filial, unidade, conta contábil, descrição, centro de custo, débito, crédito, movimento líquido, sinal aplicado, linha da máscara, fonte). Nenhum campo inferido no frontend.

### 11. Exportação XLSX
- Preferir `GET {DRE_API}/api/contabil/dre/matriz/export` (download binário). Se o backend ainda não expuser, manter fallback com ExcelJS **usando exatamente `linhas`/`meta`/filtros já em memória** (sem recálculo), incluindo Fonte, Última sincronização, Modelo, filtros aplicados e avisos de dados incompletos como linhas de cabeçalho. Adicionar TODO no código apontando para o endpoint backend.

## Detalhes técnicos

### Arquivos criados
- `src/lib/contabil/dreMatrizApi.ts`
- `src/lib/contabil/dreConciliacaoBiApi.ts`
- `src/components/contabil/DreMetaBar.tsx`
- `src/components/contabil/DreIncompletoBanner.tsx`
- `src/components/contabil/DreConciliacaoBiTab.tsx`
- `src/components/contabil/DreAcoesAdminDialog.tsx`

### Arquivos editados
- `src/lib/contabil/contabilApi.ts` — priorizar `VITE_DRE_API_URL` em `getContabilBaseUrl()`.
- `src/pages/bi/contabilidade/DrePage.tsx` — refatoração completa conforme itens 3–11.
- `.env` — adicionar `VITE_DRE_API_URL=https://dreconfiguravel.ngrok.app` (apenas essa nova var, sem tocar nas VITE_SUPABASE_*).

### Fora de escopo
- Backend, autenticação, JWT, CORS.
- Outras telas DRE (Dinâmica, Configuração, Aprovações, Studio) — só ajuste da URL base já ocorre por herança do `getContabilBaseUrl()`.
- Persistência de fonte ativa em Cloud (a fonte é 100% controlada pelo backend; não gravar em `localStorage`).

## Critério de aceite

Todos os itens listados na seção 14 da solicitação:
- `DrePage.tsx` só usa `getContabilBaseUrl()` (unificada 8070); zero referências a 8090.
- Valores exibidos = exatamente os do payload; sem soma no frontend.
- Faixa de metadados visível com fonte ativa.
- Banner + tooltip para meses/células suspeitos.
- Meses interpretados como `AAAAMM`.
- Cards derivam das linhas do payload.
- "Atualizar tela" separado de "Sincronizar ERP"/"Recalcular DRE".
- Drill-down aberto pelo backend.
- Aba "Conciliação BI" funcional.
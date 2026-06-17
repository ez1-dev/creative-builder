## Objetivo
Fazer o Montador da DRE Gerencial reconhecer corretamente o array `centros_custo` que o backend já envia em `/api/bi/contabilidade/dre-dinamica/plano-contas`, parando de exibir o falso alerta "Backend não retornou centros_custo[] em nenhuma conta".

## Causa
O mapper atual em `src/lib/bi/dreMontadorApi.ts` só aceita `centros_custo` se já for `Array.isArray(...)`. Quando o backend serializa como string JSON (caso comum em respostas vindas de `json_agg`/`to_json` repassadas por algumas rotas FastAPI), o array é descartado e o diagnóstico `semCcu` dispara mesmo havendo dados válidos.

## Mudanças

### 1. `src/lib/bi/dreMontadorApi.ts`
- Criar helper `coerceCentrosCusto(raw)` que:
  - retorna `[]` para `null`/`undefined`;
  - se for `string`, faz `JSON.parse` dentro de `try/catch` e segue;
  - se for array, usa direto;
  - caso contrário, `[]`.
- Substituir a leitura atual (`Array.isArray(r.centros_custo) && r.centros_custo || ...`) por:
  - prioridade absoluta para `r.centros_custo` via `coerceCentrosCusto`;
  - só cair nos aliases (`ccu`, `centroscusto`, `centros`, `cc`, `centros_de_custo`) se `centros_custo` estiver totalmente ausente.
- Normalizar cada centro conforme o contrato pedido:
  ```ts
  {
    cd_centro_custos,
    cd_centro_custos_3: cd_centro_custos_3 || cd_centro_custos.slice(0,3),
    qtd_lancamentos: Number(qtd_lancamentos || 0),
    valor_total: Number(valor_total ?? vl_realizado ?? 0),
    vl_realizado: Number(vl_realizado ?? valor_total ?? 0),
    ds_centro_custos,
  }
  ```
- Adicionar campos opcionais `vl_realizado?: number` e `ds_centro_custos?: string` em `PlanoContaCentroCusto`.
- Trocar os logs `[MONTADOR DRE]` para mostrar:
  - `Object.keys(arr[0])` (chaves brutas da primeira conta);
  - `typeof arr[0].centros_custo`;
  - `mapped[0].centros_custo.length`;
  - `mapped[0].centros_custo[0]` quando existir.
- Manter o `console.warn` `semCcu`, porém só dispará-lo se **toda** conta mapeada continuar com `centros_custo.length === 0` após a normalização.

### 2. `src/pages/bi/contabilidade/DreMontadorPage.tsx`
- Recalcular `diag.semCcu` em cima do array já normalizado vindo do mapper (sem mudança de contrato — já é `contas.every(...)`).
- Atualizar o `console.log('[PLANO CONTAS] ...')` da linha expandida para incluir `typeof c.centros_custo`, `c.centros_custo.length` e o primeiro item.
- Nenhuma mudança visual na tabela; o aviso âmbar só aparecerá quando realmente não houver centros após a normalização.

### 3. Sem alterações em
- Endpoint, edge functions, esquema de banco.
- Tela "Contas disponíveis do ERP" (consome o mesmo `fetchPlanoContasDinamica`, então herda o fix automaticamente).
- Docs já criados; nenhum ajuste necessário no checklist.

## Critério de aceite
- Ao chamar `/plano-contas` com `anomes_ini=202601&anomes_fim=202601`, o banner âmbar "Backend não retornou centros_custo[]" não aparece quando houver pelo menos uma conta com centros.
- Expandindo a conta `311020006` na tabela do Montador, a sub-tabela lista vários centros de custo com `cd_centro_custos`, `cd_centro_custos_3`, `qtd_lancamentos` e `valor_total`.
- Logs `[MONTADOR DRE]` no console mostram tipo, quantidade e o primeiro centro.
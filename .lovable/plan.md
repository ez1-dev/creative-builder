## Contexto

A tela `/bi/contabilidade/dre-dinamica/montador` está exibindo o banner de diagnóstico "backend não retornou `centros_custo` em nenhuma conta" porque o endpoint FastAPI `GET /api/bi/contabilidade/dre-dinamica/plano-contas` está devolvendo cada item **sem** o array `centros_custo[]` (ou devolvendo `[]` em todos).

O frontend já está preparado para consumir o contrato novo (`cd_centro_custos`, `cd_centro_custos_3`, `qtd_lancamentos`, `valor_total`) com aliases defensivos. **A correção real é no backend FastAPI.** Aqui no Lovable só posso (a) reforçar o contrato na documentação que o time de backend usa e (b) melhorar o diagnóstico para acelerar a investigação.

## Escopo do plano

### 1. `docs/backend-bi-contabilidade-dre-dinamica-montador.md`
Adicionar uma seção destacada **"Checklist de investigação quando `centros_custo` vem vazio"** com:
- Conferir se a query de agregação por `centro_custo` está sendo executada (não apenas a query de totais por conta).
- Conferir se o `LEFT JOIN` com o cadastro de CCU não está filtrando linhas (usar `LEFT JOIN`, nunca `INNER`).
- Conferir se o `json_agg(...) FILTER (WHERE rn <= 10)` está sendo serializado como array no JSON final (não como string).
- Conferir se o campo está sendo retornado com o nome `centros_custo` (snake_case, plural) — não `centro_custo`, `ccu`, etc.
- Conferir se o período `[anomes_ini, anomes_fim]` recebido tem lançamentos em `bi_vm_lanc_contabil.centro_custo` não nulo.
- SQL de smoke-test isolado para o time rodar e validar que a base tem dados:
  ```sql
  SELECT mascara, cd_conta, centro_custo, count(*), sum(vl_saldo)
  FROM bi_vm_lanc_contabil
  WHERE anomes_referente BETWEEN :ini AND :fim
    AND centro_custo IS NOT NULL
  GROUP BY 1,2,3
  ORDER BY abs(sum(vl_saldo)) DESC
  LIMIT 20;
  ```
- Resposta de exemplo **mínima válida** (1 conta com 1 CCU) para o time comparar com o que o endpoint está devolvendo hoje.

### 2. `src/lib/bi/dreMontadorApi.ts`
Melhorar o log de diagnóstico quando `semCcu === true`:
- Logar quantas contas vieram no payload (`mapped.length`).
- Logar as chaves do primeiro item bruto (`Object.keys(arr[0])`) para o time de backend ver rapidamente quais campos estão sendo enviados (e perceber se está vindo com outro nome).
- Mensagem do warn mais explícita: incluir o nome canônico esperado (`centros_custo`) e os aliases aceitos.

### 3. `src/pages/bi/contabilidade/DreMontadorPage.tsx`
No banner amber de diagnóstico (quando `semCcu`), adicionar:
- Link/texto curto apontando para o doc `docs/backend-bi-contabilidade-dre-dinamica-montador.md` (seção do checklist).
- Texto do banner deixar claro que o campo esperado é `centros_custo` (array) por item, com os 4 campos canônicos.

## Fora de escopo
- Mudar o nome do endpoint ou o shape esperado.
- Alterar `/dre-dinamica`, `/vincular-contas`, ou a UI de expansão (já está pronta para receber o array).
- Qualquer correção no FastAPI (não está neste repositório).

## Resultado esperado
Depois do deploy:
1. O time de backend recebe um checklist claro do que verificar.
2. O console do navegador mostra exatamente quais chaves o endpoint está devolvendo, acelerando o diagnóstico.
3. Assim que o backend passar a devolver `centros_custo[]`, o banner desaparece e a expansão por conta começa a popular automaticamente — sem mais nenhuma mudança no frontend.

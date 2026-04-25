## Situação

O endpoint `GET /api/faturamento-genius-dashboard` **não pertence a este projeto Lovable**. Este repositório contém apenas o **frontend** (React + Vite + TypeScript). O backend FastAPI roda em outro serviço/repositório (consumido via URL configurada na tabela `api_config` — ver `src/lib/api.ts`).

Confirmação:
- Nenhum arquivo `.py` / FastAPI no repositório.
- Nenhuma referência a `VLRDSC`, `E140IPV` ou `@app.get` no código.
- O frontend apenas **chama** `/api/faturamento-genius-dashboard` via `api.get(...)` em `src/pages/FaturamentoGeniusPage.tsx:429`.

Portanto, **não consigo editar o arquivo FastAPI a partir do Lovable** — ele vive fora deste workspace. Quem precisa aplicar a alteração SQL/Python é o time/pessoa que mantém o repositório do backend.

## O que eu posso fazer aqui (no frontend)

Quando o backend publicar `valor_desconto` e o `valor_liquido` corrigido, o frontend precisa estar pronto para:

1. **Tipos** — adicionar `valor_desconto?: number` nas interfaces de KPI / por_revenda / por_origem / por_anomes em `src/pages/FaturamentoGeniusPage.tsx`.
2. **Fórmulas locais** — atualizar três pontos em `src/pages/FaturamentoGeniusPage.tsx` para subtrair também `valor_desconto`:
   - `computeKpis` (≈ linha 264)
   - `subtractOutros` (≈ linha 298)
   - `kpisFromPorRevenda` (≈ linha 310)
   
   Trocar:
   ```ts
   const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos);
   ```
   por:
   ```ts
   const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos) - (valor_desconto ?? 0);
   ```
3. **Card opcional "Descontos"** — exibir `valor_desconto` ao lado de "Impostos" no bloco de KPIs (consistente com o relatório oficial Genius).
4. **Tabela mensal** — adicionar coluna "Desconto" (opcional, mas alinha com o relatório).
5. **Testes** — atualizar `src/pages/__tests__/FaturamentoGeniusPage.kpis.test.tsx` para usar `valor_desconto` no fixture e validar Mar/2026 → R$ 161.674.
6. **Documento** — `docs/backend-faturamento-genius-desconto.md` já existe com a especificação SQL/Python detalhada para repassar ao time backend.

## O que precisa ser feito FORA do Lovable (pelo time backend)

Aplicar exatamente o que você descreveu, no repositório FastAPI:

- Adicionar ao SELECT de `/api/faturamento-genius-dashboard`:
  ```sql
  CAST(SUM(
    CASE
      WHEN IPV.TNSPRO IN ({GENIUS_TNS_DEVOLUCAO_SQL}) THEN 0
      ELSE COALESCE(IPV.VLRDSC, 0)
    END
  ) AS FLOAT) AS valor_desconto
  ```
- Calcular em Python: `valor_liquido = valor_total - valor_impostos - valor_desconto`
- Devolver `valor_desconto` e `valor_liquido` em `kpis`, `por_revenda`, `por_origem`, `por_anomes`.
- Validar com `anomes_ini=202603&anomes_fim=202603&revenda=GENIUS` → Fat. Líq. ≈ R$ 161.674.

Já está tudo descrito em `docs/backend-faturamento-genius-desconto.md` (criado na rodada anterior).

## Pergunta

Como **não consigo modificar o backend a partir daqui**, escolha como prosseguir:

**Opção A — Preparar o frontend agora** (recomendado):
Aplico já as mudanças dos itens 1–5 acima, com fallback `?? 0`. Enquanto o backend não publicar `valor_desconto`, nada quebra (cai no comportamento atual). Assim que o backend subir o campo, os valores passam a bater automaticamente sem novo deploy do frontend.

**Opção B — Esperar o backend**:
Não toco no frontend agora. Apenas confirmo o documento `docs/backend-faturamento-genius-desconto.md` para você enviar ao time backend, e ajusto o frontend depois que o campo estiver publicado.

**Opção C — Você tem acesso ao backend FastAPI**:
Se o repositório do backend está disponível em outro lugar (GitHub, pasta local, outro projeto Lovable), me diga onde — posso gerar o **patch exato** (SQL + Python) pronto para colar lá, mas a edição em si terá que ser feita no ambiente daquele repositório.

Qual opção seguimos?

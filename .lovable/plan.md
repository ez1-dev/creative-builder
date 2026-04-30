## Diagnóstico

Investiguei o banco e identifiquei a **causa raiz** do mapa não refletir os estados:

```
SELECT COUNT(*) AS total, COUNT(uf_destino) AS com_uf FROM passagens_aereas;
 total | com_uf 
-------+--------
   300 |      0
```

**Os 300 registros existentes têm `uf_destino` NULO.** A coluna foi adicionada na migração anterior, mas:

1. Os dados já estavam no banco antes da feature, sem UF.
2. O importador só preenche `uf_destino` se a planilha tiver a coluna "UF DESTINO" — quem importou antes não tinha essa coluna.
3. O mapa, sem nenhum `uf_destino` populado, cai no fallback do dicionário de cidades — mas mesmo o dicionário cobrindo as cidades, nada está sendo coloreado de forma confiável porque parte das cidades não está no dicionário (cidades menores) e algumas variações de grafia podem não normalizar.

## Solução

Fazer um **backfill único** (UPDATE no banco) populando `uf_destino` em todos os registros existentes a partir do dicionário de cidades já existente em `cidadesBrasil.ts`. Assim:

- Dados antigos passam a ter UF correta no banco.
- O mapa usa `ufDirectMap` (caminho rápido e autoritativo).
- Importações futuras com coluna "UF DESTINO" continuam sobrepondo (já implementado).
- Cidades sem UF deduzível ficam NULL e serão exibidas no rótulo "X cidades sem geo".

## Passos

1. **Migration de backfill** (`supabase/migrations/..._backfill_uf_destino.sql`):
   - Atualiza `passagens_aereas` cruzando `UPPER(unaccent(destino))` com um `VALUES (...)` contendo o mapeamento cidade→UF (mesmo dicionário do front).
   - `WHERE uf_destino IS NULL` para não sobrescrever quaisquer valores já presentes.
   - Inclui as ~60 cidades já listadas em `cidadesBrasil.ts` mais as cidades vistas no banco (Curitiba, São Paulo, Salvador, Fortaleza, Santarém, Manaus, Itaituba, Belém, São Luís, Chapecó, Maceió, Santos, Belo Horizonte, Campinas, Teresina, Porto Alegre, Rio de Janeiro, Recife, Osasco, Goiânia etc.).

2. **Sem mudanças no frontend** — a lógica do mapa já prioriza `uf_destino` direto do registro quando presente. Após o backfill, todos os 300 registros entram nesse caminho.

3. **Verificação pós-migração** — rodar `SELECT uf_destino, COUNT(*) FROM passagens_aereas GROUP BY uf_destino` para confirmar a distribuição.

## Detalhes técnicos

```sql
-- Forma do UPDATE (resumo)
UPDATE public.passagens_aereas p
SET uf_destino = m.uf
FROM (VALUES
  ('CURITIBA','PR'), ('SAO PAULO','SP'), ('SALVADOR','BA'),
  ('FORTALEZA','CE'), ('SANTAREM','PA'), ('MANAUS','AM'),
  ('ITAITUBA','PA'), ('BELEM','PA'), ('SAO LUIS','MA'),
  ('CHAPECO','SC'), ('MACEIO','AL'), ('SANTOS','SP'),
  ('BELO HORIZONTE','MG'), ('CAMPINAS','SP'), ('TERESINA','PI'),
  ('PORTO ALEGRE','RS'), ('RIO DE JANEIRO','RJ'), ('RECIFE','PE'),
  ('OSASCO','SP'), ('GOIANIA','GO')
  -- + restantes do dicionário cidadesBrasil.ts
) AS m(cidade, uf)
WHERE p.uf_destino IS NULL
  AND UPPER(TRIM(p.destino)) = m.cidade;
```

Como o Postgres pode não ter `unaccent` instalado e os destinos no banco já estão em maiúsculas e sem acentos (verifiquei: "SAO PAULO", "SAO LUIS", "CHAPECO"), basta `UPPER(TRIM(...))`.

## Arquivos

- **novo**: `supabase/migrations/<timestamp>_backfill_uf_destino.sql`
- nenhuma mudança em código TS/TSX

Aprove para eu rodar o backfill.
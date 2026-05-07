# Regra de classificação de Projeto Macro

Aplicar **na mesma ordem** abaixo, tanto no frontend quanto no backend (FastAPI / queries do ERP) para garantir consistência entre Painel de Compras, Notas Fiscais de Recebimento, Demonstrativo Compras x Recebimentos e exportações.

## Valores possíveis

- `GENIUS`
- `ESTRUTURAL ZORTEA`
- `OUTROS`

## CASE de referência (SQL)

```sql
CASE
  -- 1) Faixa 6xx em diante é sempre Estrutural Zortea
  WHEN CAST(REGEXP_SUBSTR(numero_projeto::text, '\d+') AS INTEGER) >= 600
    THEN 'ESTRUTURAL ZORTEA'

  -- 2) Origem do material conhecida do GENIUS
  WHEN origem_material IN (
    '110','120','130','135','140','150',
    '205','208','210','220','230','235','240','245','250'
  ) THEN 'GENIUS'

  -- 3) Nome do projeto contém GENIUS / GENI
  WHEN UPPER(COALESCE(nome_projeto, descricao_projeto, '')) LIKE '%GENIUS%'
    OR UPPER(COALESCE(nome_projeto, descricao_projeto, '')) LIKE '%GENI%'
    THEN 'GENIUS'

  -- 4) Nome do projeto contém ESTRUTURAL / ZORTEA
  WHEN UPPER(COALESCE(nome_projeto, descricao_projeto, '')) LIKE '%ESTRUTURAL%'
    OR UPPER(COALESCE(nome_projeto, descricao_projeto, '')) LIKE '%ZORTEA%'
    THEN 'ESTRUTURAL ZORTEA'

  ELSE 'OUTROS'
END AS projeto_macro
```

## Notas

- A **regra 1 tem prioridade** sobre as demais — qualquer projeto 6xx é ESTRUTURAL ZORTEA, mesmo que origem ou nome remetam a Genius.
- Não classificar projetos começando por 6 como Genius em hipótese alguma.
- O frontend (`src/lib/comprasClassificacao.ts`) implementa a mesma regra e re-classifica linhas mesmo quando o backend ainda devolve nomenclaturas antigas (ex: `Estrutural` → `ESTRUTURAL ZORTEA`).

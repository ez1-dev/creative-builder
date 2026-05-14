## Importação de 232 registros — Manutenção de Máquinas

Importar diretamente no banco os 232 registros da planilha `MANUTENÇÃO_DE_MAQUINAS._EZM_COM_QUANTIDADE_2026.xlsx`, aplicando a mesma classificação automática de `tipo_maquina` usada no `ImportarMaquinasDialog`.

### Mapeamento de colunas
| Planilha | Coluna `manutencao_maquinas` |
|---|---|
| DATA | `data` |
| MÊS | `mes` (normalizado: janeiro→jan, fevereiro→fev, …) |
| FORNECEDOR | `fornecedor` |
| DESCRIÇÃO | `descricao` |
| QUANTIDADE | `quantidade` |
| MAQUINA | `maquina` |
| ORDEM DE COMPRA | `ordem_compra` |
| NOTA FISCAL | `nota_fiscal` |
| VALOR | `valor` |
| C.CUSTO | `centro_custo` |

`tipo_maquina` derivado do campo MAQUINA via regras (PONTE → PONTE ROLANTE, SOLDA/MIG/TIG → SOLDA, LASER/CORTE → LASER, COMPRESSOR → COMPRESSOR, EMPILHADEIRA → EMPILHADEIRA, PINTURA → PINTURA, SERRA → SERRA; fallback OUTROS).

### Execução
1. Ler `/tmp/maq.xlsx` com Python.
2. Gerar um único `INSERT INTO public.manutencao_maquinas (...) VALUES (...), (...), …` com as 232 linhas.
3. Executar via `supabase--insert`. O trigger `normalize_maquinas_upper` cuida de uppercase + recomputa `mes` se necessário.

### Fora de escopo
Nenhuma mudança de schema, código frontend, RPC ou layout de dashboard.

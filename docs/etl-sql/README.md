# Templates SQL canônicos do ETL

Os arquivos `.sql` neste diretório são a **fonte de verdade** dos templates estáticos referenciados pela FastAPI no dicionário `ETL_SQL_TEMPLATES` (ver `docs/backend-etl-central.md`).

Cada arquivo deve ser carregado **literalmente** (sem reformatar, sem trocar placeholders) em uma constante Python:

```python
from pathlib import Path
_SQL_DIR = Path(__file__).parent / "sql"

SQL_VM_FATURAMENTO         = (_SQL_DIR / "SQL_VM_FATURAMENTO.sql").read_text(encoding="utf-8")
SQL_VM_FATURAMENTO_MANUAL  = (_SQL_DIR / "SQL_VM_FATURAMENTO_MANUAL.sql").read_text(encoding="utf-8")
SQL_VM_FAT_CONTABIL        = (_SQL_DIR / "SQL_VM_FAT_CONTABIL.sql").read_text(encoding="utf-8")
SQL_VM_FAT_TRB             = (_SQL_DIR / "SQL_VM_FAT_TRB.sql").read_text(encoding="utf-8")
```

## Regras

- Placeholders **devem permanecer** no formato UpQuery/Senior: `$[ANOMES_INI]`, `$[ANOMES_FIM]`. **Nunca** converter para `DECLARE @var` ou `:param`.
- Qualquer alteração nestes arquivos exige replicar a mesma string no backend FastAPI (ou re-deploy lendo daqui).
- Não inserir comentários extras nas primeiras linhas — o backend trata o arquivo como SQL puro.
- Encoding: UTF-8 sem BOM.

## Arquivos atuais

| Arquivo | Constante Python | Linhas | Usado por |
|---------|------------------|--------|-----------|
| `SQL_VM_FATURAMENTO_MANUAL.sql` | `SQL_VM_FATURAMENTO_MANUAL` | 423 | ação `VM_FATURAMENTO_MANUAL` (tarefa `ATU_COMERCIAL`) |
| `SQL_VM_FAT_CONTABIL.sql`       | `SQL_VM_FAT_CONTABIL`       | 357 | ação `VM_FAT_CONTABIL` (tarefa `ATU_COMERCIAL`) |
| `SQL_VM_FAT_TRB.sql`            | `SQL_VM_FAT_TRB`            | 120 | ação `VM_FAT_TRB` (tarefa `ATU_COMERCIAL`) |

> `SQL_VM_FATURAMENTO` (ação principal) já vive no backend FastAPI; arquivo canônico ainda não foi extraído para este diretório.

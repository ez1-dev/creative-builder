## Padrão de placeholders: `$[ANOMES_INI]` / `$[ANOMES_FIM]`

Adoção do formato UpQuery/Senior em todo o módulo ETL Central. O frontend só armazena e edita o SQL — o **replace é responsabilidade da FastAPI** antes de enviar ao ERP.

### 1. Frontend (visual / editor)

**`src/components/etl/EditarSqlModal.tsx`**
- Atualizar o `<Alert>` informativo: trocar a menção de `:anomes_ini` / `:anomes_fim` por:
  > "Use placeholders `$[ANOMES_INI]` e `$[ANOMES_FIM]` (substituídos pela FastAPI antes da execução no ERP)."
- Adicionar lista de placeholders suportados (somente leitura, informativa):
  - `$[ANOMES_INI]`, `$[ANOMES_FIM]` — período em formato AAAAMM (inteiro)
- Sem mudança de schema: o campo `sql_template` continua `text` livre.

**`src/components/etl/ExecutarModal.tsx`**
- Sem mudanças funcionais (já envia `anomes_ini` / `anomes_fim` como números no payload). Apenas garantir o helper text no modal mencionando o formato do placeholder no SQL.

### 2. Validação leve no frontend (opcional, defensiva)

Adicionar utilitário `src/lib/etl/placeholders.ts`:
- `extrairPlaceholders(sql: string): string[]` — regex `/\$\[([A-Z_][A-Z0-9_]*)\]/g`
- `PLACEHOLDERS_SUPORTADOS = ['ANOMES_INI', 'ANOMES_FIM']`
- `validarPlaceholders(sql)` retorna lista de placeholders desconhecidos para alertar no modal (warning, não bloqueia salvar — FastAPI é a fonte da verdade).

No `EditarSqlModal`, mostrar um badge discreto:
- "Placeholders detectados: $[ANOMES_INI], $[ANOMES_FIM]" (verde) ou
- "Placeholder desconhecido: $[XYZ]" (amarelo/aviso).

### 3. Contrato com a FastAPI

**`docs/backend-etl-central.md`** — atualizar a seção "Execução de ação":
- A FastAPI lê `sql_template` do Cloud.
- Antes de enviar ao ERP Senior, faz `replace` literal:
  ```
  sql.replace('$[ANOMES_INI]', str(params['anomes_ini']))
     .replace('$[ANOMES_FIM]', str(params['anomes_fim']))
  ```
- **Segurança:** o backend deve validar que `anomes_ini`/`anomes_fim` são inteiros de 6 dígitos (`^\d{6}$`) antes do replace. Sem isso, abre injeção. Documentar como requisito obrigatório.
- Bloquear qualquer placeholder `$[...]` remanescente após o replace: se sobrar, abortar execução com erro `placeholder_nao_resolvido` e gravar em `etl_logs`.
- Fallback inalterado: se `sql_template` for NULL, usa SQL hardcoded do backend.

### 4. Memória do projeto

Atualizar `mem://features/etl-bi`:
- Padrão de placeholder do módulo ETL: `$[NOME]` (estilo UpQuery/Senior), substituído pela FastAPI.
- Lista canônica: `$[ANOMES_INI]`, `$[ANOMES_FIM]`.

### Fora de escopo
- Botão "Testar SQL / Preview" (decidido em separado).
- Parâmetros custom além de anomes_ini/fim (criar memo se surgir demanda).
- Migração de SQL antigo: como ainda não há `sql_template` populado, basta colar as queries do UpQuery já no formato `$[ANOMES_INI]`.

### Arquivos alterados
- `src/components/etl/EditarSqlModal.tsx` — texto do alerta + badge de placeholders
- `src/components/etl/ExecutarModal.tsx` — pequeno helper text
- `src/lib/etl/placeholders.ts` (novo) — utilitário de extração/validação
- `docs/backend-etl-central.md` — contrato de replace + validação anti-injeção
- `mem://features/etl-bi` — registrar padrão

## Diagnóstico

O frontend **já tem quase tudo** que você pediu:

- Botão **Desconectar** em cada linha (`src/pages/MonitorUsuariosSeniorPage.tsx`, linhas 624–628), só aparece para `ADMIN` ou `RENATO` (`canDisconnect`, linha 113).
- Modal `AlertDialog` que exige **motivo** com validação Zod (`min 5`, `max 500`), linhas 642–685.
- POST para `/api/senior/sessoes/{numsec}/desconectar` com `{ confirmar: true, motivo }` (linhas 390–393).
- `await load()` após sucesso para atualizar a tabela (linha 397).

O que **falta**:

1. **Backend FastAPI**: o endpoint não existe ainda. Como o backend é externo (FastAPI rodando via ngrok), eu não consigo criar o arquivo Python aqui — entrego a documentação completa em `docs/backend-senior-desconectar-sessao.md` para você levar pra equipe do FastAPI.
2. **Frontend**: três ajustes de UX:
   - Mostrar o **aviso sobre Terminal Server** após sucesso.
   - Exibir **usuário, computador e qtd de registros removidos** no toast (resposta do backend).
   - Logar erros em `errorLogger` para aparecerem no painel de erros.

## Mudanças

### 1) Documentação backend — `docs/backend-senior-desconectar-sessao.md` (novo)

Spec completa para a equipe do FastAPI implementar:

**Rota**: `POST /api/senior/sessoes/{numsec}/desconectar`

**Auth**: `Authorization: Bearer <token>` obrigatório. Se ausente/expirado → `401`.

**Autorização**: usuário do token deve ser `ADMIN` (flag `is_admin`) **ou** ter `usuario == 'RENATO'` (case-insensitive). Caso contrário → `403 { "detail": "Apenas ADMIN ou RENATO podem desconectar sessões." }`.

**Body** (Pydantic):
```python
class DesconectarSessaoRequest(BaseModel):
    confirmar: bool
    motivo: str = Field(min_length=5, max_length=500)
```
Se `confirmar != true` → `400 { "detail": "Confirmação obrigatória." }`.

**Path param**: `numsec: int` (ou `str` numérica — conferir tipo da coluna `R911SEC.NumSec` no Senior; pelos dados reais vem como inteiro).

**Fluxo SQL** (SQL Server, dentro de **uma transação**):

```sql
BEGIN TRAN;

-- 1) Validar existência + capturar dados pra log/resposta
SELECT TOP 1
    LTRIM(RTRIM(AppUsr)) AS usuario_senior,
    LTRIM(RTRIM(ComNam)) AS computador,
    LTRIM(RTRIM(AppNam)) AS aplicativo
INTO #sessao
FROM R911SEC
WHERE NumSec = @numsec;

IF NOT EXISTS (SELECT 1 FROM #sessao)
BEGIN
    ROLLBACK;
    -- 404
END

-- 2) Apagar nas 3 tabelas
DELETE FROM R911MOD WHERE NumSec = @numsec;  -- @mod_removidos = @@ROWCOUNT
DELETE FROM R911SRV WHERE NumSec = @numsec;  -- @srv_removidos = @@ROWCOUNT
DELETE FROM R911SEC WHERE NumSec = @numsec;  -- @sec_removidos = @@ROWCOUNT

-- 3) Log de auditoria (DEPOIS dos deletes, dentro da mesma transação)
INSERT INTO dbo.USU_LOG_SESSAO_SENIOR
    (numsec, usuario_alvo, computador, executado_por, motivo,
     mod_removidos, srv_removidos, sec_removidos, data_hora)
VALUES
    (@numsec, @usuario_senior, @computador, @executado_por, @motivo,
     @mod_removidos, @srv_removidos, @sec_removidos, GETDATE());

COMMIT;
```

Em qualquer exceção → `ROLLBACK` e `500 { "detail": "Falha ao desconectar sessão. Nada foi alterado.", "error": "<msg>" }`.

**DDL da tabela de log** (criar se ainda não existir):
```sql
IF OBJECT_ID('dbo.USU_LOG_SESSAO_SENIOR') IS NULL
CREATE TABLE dbo.USU_LOG_SESSAO_SENIOR (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    numsec          BIGINT      NOT NULL,
    usuario_alvo    VARCHAR(60) NULL,
    computador      VARCHAR(60) NULL,
    executado_por   VARCHAR(60) NOT NULL,
    motivo          VARCHAR(500) NOT NULL,
    mod_removidos   INT NOT NULL DEFAULT 0,
    srv_removidos   INT NOT NULL DEFAULT 0,
    sec_removidos   INT NOT NULL DEFAULT 0,
    data_hora       DATETIME    NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_USU_LOG_SESSAO_SENIOR_data ON dbo.USU_LOG_SESSAO_SENIOR(data_hora DESC);
CREATE INDEX IX_USU_LOG_SESSAO_SENIOR_user ON dbo.USU_LOG_SESSAO_SENIOR(usuario_alvo);
```

**Respostas**:

- `200 OK`:
  ```json
  {
    "ok": true,
    "numsec": 12345,
    "usuario": "FULANO",
    "computador": "PC-FULANO",
    "registros_removidos": {
      "R911MOD": 1,
      "R911SRV": 0,
      "R911SEC": 1,
      "total": 2
    },
    "mensagem": "Sessão removida do controle do ERP. Se o SAPIENS continuar aberto no Terminal Server, pode ser necessário encerrar a sessão Windows.",
    "executado_por": "RENATO",
    "data_hora": "2026-05-01 10:42:17"
  }
  ```
- `401` token ausente/expirado.
- `403` usuário sem permissão.
- `400` `confirmar=false` ou `motivo` < 5 chars.
- `404` `numsec` não existe em `R911SEC`.
- `500` qualquer erro de SQL → rollback feito.

**Importante**: os `DELETE` precisam ser feitos com **parâmetro** (`?` ou `:numsec`), nunca interpolando string — risco de SQL injection com `numsec` vindo da URL.

**Esqueleto Python (FastAPI + pyodbc)** — pra colar no projeto FastAPI:
```python
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from .auth import get_current_user, require_admin_or_renato  # já existem no projeto
from .db import get_conn

router = APIRouter()

class DesconectarSessaoRequest(BaseModel):
    confirmar: bool
    motivo: str = Field(min_length=5, max_length=500)

@router.post("/api/senior/sessoes/{numsec}/desconectar")
def desconectar_sessao(
    numsec: int = Path(..., ge=1),
    body: DesconectarSessaoRequest = ...,
    user = Depends(require_admin_or_renato),
):
    if not body.confirmar:
        raise HTTPException(400, "Confirmação obrigatória.")

    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT TOP 1 LTRIM(RTRIM(AppUsr)), LTRIM(RTRIM(ComNam)), LTRIM(RTRIM(AppNam))
                FROM R911SEC WHERE NumSec = ?
            """, numsec)
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, f"Sessão {numsec} não encontrada.")
            usuario_alvo, computador, aplicativo = row

            cur.execute("DELETE FROM R911MOD WHERE NumSec = ?", numsec); mod_n = cur.rowcount
            cur.execute("DELETE FROM R911SRV WHERE NumSec = ?", numsec); srv_n = cur.rowcount
            cur.execute("DELETE FROM R911SEC WHERE NumSec = ?", numsec); sec_n = cur.rowcount

            cur.execute("""
                INSERT INTO dbo.USU_LOG_SESSAO_SENIOR
                    (numsec, usuario_alvo, computador, executado_por, motivo,
                     mod_removidos, srv_removidos, sec_removidos)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, numsec, usuario_alvo, computador, user.usuario, body.motivo, mod_n, srv_n, sec_n)

            conn.commit()
        except HTTPException:
            conn.rollback(); raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(500, f"Falha ao desconectar sessão. Nada foi alterado. {e}")

    return {
        "ok": True,
        "numsec": numsec,
        "usuario": usuario_alvo,
        "computador": computador,
        "registros_removidos": {
            "R911MOD": mod_n, "R911SRV": srv_n, "R911SEC": sec_n,
            "total": mod_n + srv_n + sec_n,
        },
        "mensagem": ("Sessão removida do controle do ERP. Se o SAPIENS continuar aberto "
                     "no Terminal Server, pode ser necessário encerrar a sessão Windows."),
        "executado_por": user.usuario,
    }
```

Adicionar lembrete: rota deve estar no router de senior e CORS já libera o preview Lovable + header `ngrok-skip-browser-warning: true` (já configurado para as outras rotas senior).

### 2) Frontend — `src/pages/MonitorUsuariosSeniorPage.tsx`

Pequenos ajustes em `confirmDisconnect` (linhas 381–403):

- Tipar a resposta e usar `usuario`, `computador`, `registros_removidos.total` no toast.
- Mostrar o **aviso de Terminal Server** como toast separado, persistente alguns segundos, com a mensagem exata pedida.
- Logar erros via `logError` pra aparecerem no painel de erros (mesmo padrão das outras pages).

```ts
const confirmDisconnect = async () => {
  if (!target) return;
  const parsed = motivoSchema.safeParse(motivo);
  if (!parsed.success) {
    toast({ title: 'Motivo inválido', description: parsed.error.issues[0].message, variant: 'destructive' });
    return;
  }
  setSubmitting(true);
  try {
    const resp = await api.post<{
      ok: boolean;
      numsec: number | string;
      usuario?: string;
      computador?: string;
      registros_removidos?: { R911MOD: number; R911SRV: number; R911SEC: number; total: number };
      mensagem?: string;
    }>(`/api/senior/sessoes/${target.numsec}/desconectar`, {
      confirmar: true,
      motivo: parsed.data,
    });

    const total = resp?.registros_removidos?.total ?? 0;
    const usuario = resp?.usuario ?? target.usuario_senior ?? '?';
    const computador = resp?.computador ?? target.computador ?? '?';

    toast({
      title: 'Sessão desconectada',
      description: `${usuario} @ ${computador} — ${total} registro(s) removido(s).`,
    });
    // Aviso obrigatório sobre Terminal Server (mensagem do backend ou fallback)
    toast({
      title: 'Atenção',
      description: resp?.mensagem
        ?? 'Sessão removida do controle do ERP. Se o SAPIENS continuar aberto no Terminal Server, pode ser necessário encerrar a sessão Windows.',
      duration: 8000,
    });

    setTarget(null);
    setMotivo('');
    await load();
  } catch (e: any) {
    toast({
      title: 'Erro ao desconectar',
      description: e?.message ?? 'Falha desconhecida',
      variant: 'destructive',
    });
  } finally {
    setSubmitting(false);
  }
};
```

Demais coisas (modal, motivo, validação Zod, botão só pra ADMIN/RENATO, refresh da tabela) já estão implementadas e **não mudam**.

## O que NÃO muda

- Lista, filtros, KPIs, ordenação, busca, export CSV, alias `/usuarios-conectados`.
- Modal de confirmação e validação do motivo.
- Permissão `canDisconnect` (ADMIN ou RENATO) — já está correta.
- Auth Bearer e tratamento de 401 (já no `api.ts`).

## Validação após deploy do backend

1. Login como `RENATO` ou usuário admin → botão **Desconectar** aparece.
2. Login como qualquer outro usuário → aparece badge "Somente consulta".
3. Clicar **Desconectar** → modal abre exigindo motivo de 5–500 chars.
4. Confirmar → toast verde com `usuario @ computador — N registro(s) removido(s)` + toast amarelo com aviso do Terminal Server.
5. Tabela recarrega e a linha some.
6. No banco, `SELECT TOP 5 * FROM dbo.USU_LOG_SESSAO_SENIOR ORDER BY data_hora DESC` mostra o registro.
7. Sem token → `401`. Usuário não autorizado → `403`. `numsec` inválido → `404`. Tudo isso vira toast vermelho.

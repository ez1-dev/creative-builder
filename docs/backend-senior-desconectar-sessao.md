# Backend FastAPI — `POST /api/senior/sessoes/{numsec}/desconectar`

Spec da rota que **desconecta de fato** um usuário conectado no Senior/Sapiens, removendo a sessão do controle do ERP (tabelas `R911SEC`, `R911MOD`, `R911SRV`) e gravando um log de auditoria em `dbo.USU_LOG_SESSAO_SENIOR`.

> Frontend já consome essa rota em `src/pages/MonitorUsuariosSeniorPage.tsx` (botão "Desconectar" → modal com motivo). Ao publicar o endpoint, a tela passa a funcionar de ponta a ponta.

---

## 1) Contrato HTTP

### Rota
```
POST /api/senior/sessoes/{numsec}/desconectar
```

### Headers
- `Authorization: Bearer <token>` — obrigatório.
- `Content-Type: application/json`
- `ngrok-skip-browser-warning: true` (já enviado pelo frontend; CORS deve continuar liberado para o domínio do preview Lovable e o domínio publicado).

### Path param
- `numsec` (`int`, ≥ 1) — `R911SEC.NumSec`.

### Body (Pydantic)
```python
from pydantic import BaseModel, Field

class DesconectarSessaoRequest(BaseModel):
    confirmar: bool
    motivo: str = Field(min_length=5, max_length=500)
```
Se `confirmar` não for `true` → `400 { "detail": "Confirmação obrigatória." }`.

### Autorização
Apenas usuários **ADMIN** (flag `is_admin` do token) **ou** com `usuario.upper() == 'RENATO'`. Caso contrário → `403 { "detail": "Apenas ADMIN ou RENATO podem desconectar sessões." }`.

### Códigos de retorno
| Status | Quando |
|--------|--------|
| 200 | Sucesso, com transação commitada. |
| 400 | `confirmar=false` ou `motivo` inválido. |
| 401 | Token ausente/expirado. |
| 403 | Usuário sem permissão. |
| 404 | `numsec` não existe em `R911SEC`. |
| 500 | Falha de SQL — rollback feito, **nenhuma** linha alterada. |

### Resposta 200 (formato esperado pelo frontend)
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

---

## 2) DDL da tabela de log

Criar uma única vez (idempotente):

```sql
IF OBJECT_ID('dbo.USU_LOG_SESSAO_SENIOR') IS NULL
BEGIN
    CREATE TABLE dbo.USU_LOG_SESSAO_SENIOR (
        id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        numsec          BIGINT       NOT NULL,
        usuario_alvo    VARCHAR(60)  NULL,
        computador      VARCHAR(60)  NULL,
        executado_por   VARCHAR(60)  NOT NULL,
        motivo          VARCHAR(500) NOT NULL,
        mod_removidos   INT          NOT NULL DEFAULT 0,
        srv_removidos   INT          NOT NULL DEFAULT 0,
        sec_removidos   INT          NOT NULL DEFAULT 0,
        data_hora       DATETIME     NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX IX_USU_LOG_SESSAO_SENIOR_data ON dbo.USU_LOG_SESSAO_SENIOR(data_hora DESC);
    CREATE INDEX IX_USU_LOG_SESSAO_SENIOR_user ON dbo.USU_LOG_SESSAO_SENIOR(usuario_alvo);
END
```

---

## 3) Fluxo SQL — tudo em uma transação

```sql
BEGIN TRAN;

-- 1) Validar existência + capturar dados pra log/resposta
DECLARE @usuario_alvo VARCHAR(60),
        @computador   VARCHAR(60),
        @aplicativo   VARCHAR(60);

SELECT TOP 1
    @usuario_alvo = LTRIM(RTRIM(AppUsr)),
    @computador   = LTRIM(RTRIM(ComNam)),
    @aplicativo   = LTRIM(RTRIM(AppNam))
FROM R911SEC
WHERE NumSec = @numsec;

IF @usuario_alvo IS NULL
BEGIN
    ROLLBACK;
    -- responder 404
END

-- 2) DELETEs nas três tabelas
DELETE FROM R911MOD WHERE NumSec = @numsec;  -- @mod_n = @@ROWCOUNT
DELETE FROM R911SRV WHERE NumSec = @numsec;  -- @srv_n = @@ROWCOUNT
DELETE FROM R911SEC WHERE NumSec = @numsec;  -- @sec_n = @@ROWCOUNT

-- 3) Log de auditoria (dentro da MESMA transação)
INSERT INTO dbo.USU_LOG_SESSAO_SENIOR
    (numsec, usuario_alvo, computador, executado_por, motivo,
     mod_removidos, srv_removidos, sec_removidos)
VALUES
    (@numsec, @usuario_alvo, @computador, @executado_por, @motivo,
     @mod_n, @srv_n, @sec_n);

COMMIT;
```

> Em qualquer exceção: `ROLLBACK` e `500`. **Nada** pode ficar parcialmente removido.

> **Segurança**: usar parâmetros (`?` em pyodbc, `:numsec` em SQLAlchemy) — **nunca** interpolar `numsec` na string SQL.

---

## 4) Esqueleto Python (FastAPI + pyodbc)

```python
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from .auth import get_current_user            # já existe no projeto
from .db import get_conn                      # já existe no projeto

router = APIRouter()


class DesconectarSessaoRequest(BaseModel):
    confirmar: bool
    motivo: str = Field(min_length=5, max_length=500)


def require_admin_or_renato(user = Depends(get_current_user)):
    is_admin = bool(getattr(user, "is_admin", False))
    is_renato = str(getattr(user, "usuario", "")).strip().upper() == "RENATO"
    if not (is_admin or is_renato):
        raise HTTPException(403, "Apenas ADMIN ou RENATO podem desconectar sessões.")
    return user


@router.post("/api/senior/sessoes/{numsec}/desconectar")
def desconectar_sessao(
    body: DesconectarSessaoRequest,
    numsec: int = Path(..., ge=1),
    user = Depends(require_admin_or_renato),
):
    if not body.confirmar:
        raise HTTPException(400, "Confirmação obrigatória.")

    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("""
                SELECT TOP 1
                    LTRIM(RTRIM(AppUsr)),
                    LTRIM(RTRIM(ComNam)),
                    LTRIM(RTRIM(AppNam))
                FROM R911SEC
                WHERE NumSec = ?
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
            """, numsec, usuario_alvo, computador, user.usuario,
                 body.motivo, mod_n, srv_n, sec_n)

            conn.commit()
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(500, f"Falha ao desconectar sessão. Nada foi alterado. {e}")

    from datetime import datetime
    return {
        "ok": True,
        "numsec": numsec,
        "usuario": usuario_alvo,
        "computador": computador,
        "registros_removidos": {
            "R911MOD": mod_n,
            "R911SRV": srv_n,
            "R911SEC": sec_n,
            "total": mod_n + srv_n + sec_n,
        },
        "mensagem": ("Sessão removida do controle do ERP. Se o SAPIENS continuar aberto "
                     "no Terminal Server, pode ser necessário encerrar a sessão Windows."),
        "executado_por": user.usuario,
        "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
```

> Lembrete CORS: já está liberado para as outras rotas `/api/senior/*`. Garantir que o método `POST` está incluído na lista de métodos permitidos.

---

## 5) Aviso importante para o usuário final

A remoção desses 3 registros tira a sessão do **controle do ERP**, mas o processo `SAPIENS.EXE` em si pode continuar rodando dentro do Terminal Server até o Windows fechar a sessão do usuário. Por isso o frontend exibe o aviso:

> "Sessão removida do controle do ERP. Se o SAPIENS continuar aberto no Terminal Server, pode ser necessário encerrar a sessão Windows."

Se for desejado matar o processo Windows também, isso é outra rota (`logoff` via PowerShell/WMI no Terminal Server) e **não está no escopo aqui**.

---

## 6) Validação após deploy

```bash
# 1) Token válido + admin/renato + numsec real
curl -X POST "$API/api/senior/sessoes/12345/desconectar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"confirmar": true, "motivo": "Sessão travada no PC do usuário"}'
# → 200 com registros_removidos

# 2) Sem token → 401
# 3) Usuário comum → 403
# 4) numsec inexistente → 404 + nada removido
# 5) motivo curto → 400

# Conferir auditoria
SELECT TOP 10 * FROM dbo.USU_LOG_SESSAO_SENIOR ORDER BY data_hora DESC;
```

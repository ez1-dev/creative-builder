
## Objetivo

Fechar o ciclo de log de navegação:

1. Entregar o **código pronto do módulo FastAPI** (`/api/navegacao/log` e `/api/navegacao/heartbeat`) para você colar no seu backend externo (ngrok). Esse arquivo não fica no repo Lovable — o FastAPI roda fora daqui.
2. Ajustar o logger do frontend para usar o endpoint dedicado de heartbeat quando o FastAPI estiver online (hoje ele manda tudo em `/api/navegacao/log`).

O frontend já está integrado: dispara `ABRIU_TELA` / `TROCOU_TELA` ao navegar e `HEARTBEAT` a cada 60s, com Bearer token e fallback para a edge function. Só precisa do split do heartbeat.

---

## 1. Frontend (no repo Lovable)

### `src/lib/navegacaoLogger.ts`
- Adicionar parâmetro de rota no `tryFastApi(payload, endpoint)`.
- Em `postLog`, usar `/api/navegacao/heartbeat` quando `payload.acao === 'HEARTBEAT'`, senão `/api/navegacao/log`.
- A edge function `navegacao-log` continua recebendo todos os tipos no fallback (já trata `HEARTBEAT` no enum).
- Sem mudança de assinatura nas funções `logAbriuTela` / `logHeartbeat` etc.

Nada muda em `UserTrackingProvider.tsx`, `userTracking.ts`, banco, RLS, ou edge function.

---

## 2. Backend FastAPI (entregue como snippet, você cola no seu projeto externo)

Arquivo sugerido: `app/routers/navegacao.py`

```python
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os, httpx, jwt

router = APIRouter(prefix="/api/navegacao", tags=["navegacao"])

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]  # do projeto Supabase

class NavegacaoIn(BaseModel):
    sistema: str = "ERP_WEB"
    cod_tela: str
    nome_tela: str
    acao: str  # ABRIU_TELA | TROCOU_TELA | FECHOU_TELA | HEARTBEAT
    path_url: Optional[str] = None
    observacao: Optional[str] = None
    session_id: Optional[str] = None
    computador: Optional[str] = None
    origem_evento: str = "ERP_WEB"
    detalhes: Optional[Dict[str, Any]] = None

def _decode_user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        # Supabase assina com HS256 + jwt secret do projeto
        claims = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid token: {e}")
    return claims

async def _insert_log(row: Dict[str, Any]) -> None:
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    url = f"{SUPABASE_URL}/rest/v1/usu_log_navegacao_erp"
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.post(url, json=row, headers=headers)
        if r.status_code >= 300:
            raise HTTPException(502, f"Supabase insert failed: {r.status_code} {r.text}")

def _row_from_payload(
    payload: NavegacaoIn,
    claims: Dict[str, Any],
    request: Request,
    user_agent: Optional[str],
    forced_acao: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = claims.get("sub")
    email = claims.get("email")
    # IP: respeita proxy/ngrok
    xff = request.headers.get("x-forwarded-for")
    ip = (xff.split(",")[0].strip() if xff else (request.client.host if request.client else None))
    return {
        "user_id": user_id,
        "user_email": email,
        "sistema": payload.sistema,
        "tela_codigo": payload.cod_tela,
        "tela_nome": payload.nome_tela,
        "acao": forced_acao or payload.acao,
        "path_url": payload.path_url,
        "observacao": payload.observacao,
        "session_id": payload.session_id,
        "computador": payload.computador,
        "user_agent": user_agent,
        "ip": ip,
        "origem_evento": payload.origem_evento or "ERP_WEB",
        "detalhes": payload.detalhes or {},
    }

@router.post("/log")
async def log_navegacao(
    payload: NavegacaoIn,
    request: Request,
    authorization: Optional[str] = Header(None),
    user_agent: Optional[str] = Header(None),
):
    claims = _decode_user(authorization)
    await _insert_log(_row_from_payload(payload, claims, request, user_agent))
    return {"ok": True}

@router.post("/heartbeat")
async def heartbeat_navegacao(
    payload: NavegacaoIn,
    request: Request,
    authorization: Optional[str] = Header(None),
    user_agent: Optional[str] = Header(None),
):
    claims = _decode_user(authorization)
    # força acao=HEARTBEAT independentemente do que vier no body
    await _insert_log(_row_from_payload(payload, claims, request, user_agent, forced_acao="HEARTBEAT"))
    return {"ok": True}
```

Em `app/main.py`:
```python
from app.routers import navegacao
app.include_router(navegacao.router)
```

Variáveis de ambiente necessárias no FastAPI:
- `SUPABASE_URL` — `https://cpgyhjqufxeweyswosuw.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role do projeto (NUNCA exposto no frontend; usado só dentro do FastAPI)
- `SUPABASE_JWT_SECRET` — JWT secret do projeto (usado para validar o token Bearer do usuário)

CORS já liberado para preview Lovable + header `ngrok-skip-browser-warning` (regra do projeto), nada novo.

### Por que validar JWT no FastAPI
O frontend manda `Authorization: Bearer <access_token Supabase>` (já é o que o `api` client faz). O FastAPI:
- decodifica o JWT com `SUPABASE_JWT_SECRET` para extrair `sub` (user_id) e `email`;
- usa a service role só para inserir na tabela com user_id já validado;
- nunca recebe senha;
- nunca devolve service role para o cliente.

---

## Detalhes técnicos

### Tabela e enum (já existem)
- `public.usu_log_navegacao_erp` — colunas: `user_id`, `user_email`, `erp_user`, `sistema`, `tela_codigo`, `tela_nome`, `acao` (enum `navegacao_acao`), `path_url`, `observacao`, `session_id`, `computador`, `user_agent`, `ip`, `origem_evento`, `detalhes`, `created_at`.
- Enum `navegacao_acao` já tem `ABRIU_TELA`, `TROCOU_TELA`, `FECHOU_TELA`, `HEARTBEAT`, mais os antigos (`entrar`, `sair`, `click`, `erro`).
- RLS permite admin ler tudo, usuário lê apenas o próprio. Insert via service role bypassa RLS sem expor nada.

### Sticky channel (lógica atual)
O logger lembra qual canal entregou o último log (FastAPI ou edge) por 60s, evitando bater no canal morto a cada navegação. Continua valendo após o split — mesmo sticky para os dois endpoints.

### Formato data/hora e IP
- IP: `X-Forwarded-For` primeiro (ngrok injeta), `request.client.host` como fallback.
- `created_at` é preenchido pelo default da tabela (`now()`), não precisa enviar.

### Nada muda na edge function
A edge `navegacao-log` (Lovable Cloud) continua sendo o fallback único para os dois tipos. Mantém compatibilidade caso o FastAPI caia.

---

## Arquivos

**Modificado no repo:**
- `src/lib/navegacaoLogger.ts` — split de endpoint por `acao`.

**Entregue como snippet (você cola no seu FastAPI externo):**
- `app/routers/navegacao.py`
- 1 linha em `app/main.py` para `include_router`.

**Sem mudança:**
- Banco / migrations / RLS
- Edge function `navegacao-log`
- `UserTrackingProvider.tsx`, `userTracking.ts`, `MonitorNavegacaoSection.tsx`

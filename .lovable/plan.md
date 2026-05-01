## Diagnóstico

A tela `/monitor-usuarios-senior` já recebe os dados (`{ total, dados }`), mas mostra `01/01/1970` na coluna **Data Conexão** porque o backend está retornando `S.DatTim` como `NUMERIC` do Senior (ex.: `46140.431939`) — esse valor **não é** Unix timestamp em segundos nem em ms, é o formato interno de data do Senior.

No frontend, `toIsoDate()` em `src/pages/MonitorUsuariosSeniorPage.tsx` (linhas 56–68) faz exatamente o que você pediu para evitar:

```ts
if (typeof v === 'number') {
  const ms = v < 1e12 ? v * 1000 : v; // ← trata como Unix → vira 1970
  ...
}
```

Como `46140.431939` é menor que `1e12`, ele multiplica por 1000 e cai no início de 1970. Isso também contamina `minutos_conectado`, que usa `data_hora_conexao` como base quando não vem do backend.

A correção precisa acontecer nos **dois lados**:

1. **Backend FastAPI** (`GET /api/senior/sessoes`) — formatar a data no SQL.
2. **Frontend** — parar de tratar número como timestamp Unix e exibir a string já formatada.

Observação: o título da sua mensagem diz "NÃO ESTÁ DESCONECTANDO O USUÁRIO", mas o corpo todo é sobre data/módulo. Vou tratar **só do problema de data e módulo nulo** descrito. Se o botão de desconectar também estiver com defeito, me diga depois exatamente o que acontece (erro, request, resposta) que ataco em separado.

## Mudanças

### 1) Backend FastAPI — `GET /api/senior/sessoes`

Substituir o SELECT da query atual por (apenas as colunas afetadas — manter o resto igual):

```sql
SELECT
    S.NumSec AS sessao,
    LTRIM(RTRIM(S.AppUsr)) AS usuario_senior,
    LTRIM(RTRIM(S.UsrNam)) AS usuario_sistema_operacional,
    LTRIM(RTRIM(S.ComNam)) AS computador,
    LTRIM(RTRIM(S.AppNam)) AS aplicativo,

    COALESCE(NULLIF(LTRIM(RTRIM(M.ModNam)), ''), '-') AS codigo_modulo,

    CASE
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'All'  THEN 'BackOffice / Licenca Flutuante'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'M'    THEN 'Manufatura'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'U'    THEN 'Custos'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'V'    THEN 'Servicos'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'EMDC' THEN 'Integracoes'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = 'WWEB' THEN 'Web 5.0'
        WHEN LTRIM(RTRIM(ISNULL(M.ModNam, ''))) = ''     THEN '-'
        ELSE LTRIM(RTRIM(M.ModNam))
    END AS modulo_acessado,

    CONVERT(VARCHAR(19), CAST(S.DatTim AS DATETIME), 120) AS data_hora_conexao,
    DATEDIFF(MINUTE, CAST(S.DatTim AS DATETIME), GETDATE())  AS minutos_conectado,

    S.IDInst  AS instancia,
    S.AppKnd  AS tipo_aplicacao,
    S.AdmMsg  AS mensagem_admin
FROM R911SEC S
LEFT JOIN R911MOD M ON M.NumSec = S.NumSec
WHERE S.AppNam = 'SAPIENS'
  AND LTRIM(RTRIM(ISNULL(S.AppUsr, ''))) <> ''
ORDER BY S.AppUsr, S.NumSec, M.ModNam;
```

`data_hora_conexao` passa a vir como string `'YYYY-MM-DD HH:MM:SS'` e `minutos_conectado` já vem calculado pelo SQL Server (consistente com o relógio do banco, sem depender do fuso do navegador).

### 2) Frontend — `src/pages/MonitorUsuariosSeniorPage.tsx`

**a. Reescrever `toIsoDate` para NÃO tratar número como Unix timestamp.** Aceitar:
- string `'YYYY-MM-DD HH:MM:SS'` (formato 120) → retornar como veio.
- string ISO válida → retornar como veio.
- número → retornar `undefined` (formato Senior numérico que não conseguimos converter no front).
- vazio/null → `undefined`.

```ts
const toIsoDate = (v: any): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return undefined;
    // Formato SQL 120: 'YYYY-MM-DD HH:MM:SS' — devolver como está
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)) return s;
    // Outras strings: só aceitar se parseiam para data válida
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : s;
  }
  // number (formato NUMERIC do Senior) ou outro tipo: ignorar
  return undefined;
};
```

**b. `normalizeSessao`:** preferir `minutos_conectado` do backend; só calcular no front se a data vier em formato parseável (string). Não calcular a partir de número Senior.

```ts
let minutos_conectado = pick(raw, 'minutos_conectado', 'minutos', 'min_conectado');
if ((minutos_conectado === undefined || minutos_conectado === null) && typeof data_hora_conexao === 'string') {
  const d = new Date(data_hora_conexao.replace(' ', 'T'));
  if (!isNaN(d.getTime())) {
    minutos_conectado = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  }
}
```

**c. `fmtDateTime`:** se a string já estiver no formato `'YYYY-MM-DD HH:MM:SS'`, formatar como `dd/MM/yyyy HH:mm` sem usar `new Date()` (evita qualquer surpresa de timezone). Senão, fallback atual.

```ts
const fmtDateTime = (v?: string) => {
  if (!v) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};
```

## O que NÃO muda

- Filtros, KPIs, ordenação, busca, export CSV, alias `/usuarios-conectados`, autenticação Bearer e retry em 401.
- Demais colunas (`codigo_modulo`, `modulo_acessado` etc.) continuam tolerando null no front; backend agora também já entrega `'-'` quando vazio.

## Validação

Após aplicar:
- Coluna **Data Conexão** mostra a data real (ex.: `27/04/2026 10:31`) em vez de `01/01/1970`.
- Coluna **Tempo Conectado** usa `minutos_conectado` vindo do banco.
- Linhas com `M.ModNam` null mostram `-` em **Cód. Módulo** e **Módulo**.
- Console: `response.dados` continua chegando com `total` linhas e a tabela renderiza todas.

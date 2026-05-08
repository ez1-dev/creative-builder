## Por que o mapa não aparece

O componente `MapaCidadesViagens` já existe e está registrado no catálogo + no fallback do hook. Mas o dashboard default no banco ainda guarda o layout antigo (sem `mapa-cidades` e com `charts-row` em `y=3`), que ocupa o slot do novo mapa. O grid resolve a colisão "engolindo" o widget novo.

```
banco hoje                 esperado
kpis-row         y=0       kpis-row         y=0
mapa-destinos    y=15      mapa-cidades     y=3   ← falta
charts-row       y=3       mapa-destinos    y=11
tabela-registros y=22      charts-row       y=18
                           tabela-registros y=30
```

## Mudanças

### 1. Migration — atualizar `upsert_passagens_dashboard_default()`
- Inserir o widget `mapa-cidades` quando faltar.
- Em vez do `INSERT ... WHERE NOT EXISTS` atual, fazer **UPSERT por tipo** dos 5 widgets canônicos com `position` e `layout` corretos, para reposicionar o `charts-row`/`mapa-destinos` que já existem.
- Layouts: `kpis-row(y0,h3)`, `mapa-cidades(y3,h8)`, `mapa-destinos(y11,h7)`, `charts-row(y18,h12)`, `tabela-registros(y30,h10)`.

### 2. Executar a função no dashboard default
Rodar `SELECT public.upsert_passagens_dashboard_default()` para que o dashboard existente receba o widget novo e os y atualizados. (Feito via migration final block ou via insert tool.)

### 3. Hardening do `MapaCidadesViagens`
- Proteger `Math.max([])` quando `cidades.length === 0` (já tem `, 1` mas o spread `Math.max(...[])` retorna `-Infinity`; o `, 1` cobre, ok — só revisar).
- Marker key inclui `uf` para evitar colisão entre cidades homônimas.

Sem mudanças em RLS, permissões ou outros componentes.
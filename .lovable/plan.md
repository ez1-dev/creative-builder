
## Alinhar contrato `/api/estoque/movimentacao` ao consumidor da tela

### Diagnóstico
Comparei o que `src/pages/SugestaoMinMaxPage.tsx` consome (e o que `src/lib/demoMovimentacao.ts` produz no modo demo) com o SQL atual de `docs/backend-rota-movimentacao.md`. Há 3 divergências que quebram a tela ao trocar demo → backend real:

| Campo no frontend (demo) | SQL atual no doc | Problema |
|---|---|---|
| `tipo_movimento: 'ENT' \| 'SAI'` | `MVP.TIPMOV` (devolve `'E'` / `'S'`) | Tela espera string de 3 letras; backend devolve 1 letra → filtros e badges quebram. |
| `fornecedor: string \| null` | `NULL AS fornecedor` (TODO) | Sempre `null` no real, populado no demo → coluna sempre vazia em produção. |
| `origem: string` | `NULL AS origem` | Idem. Tela mostra "—" sempre. |
| `consumo_medio`, `minimo_sugerido`, `maximo_sugerido`, `lead_time_dias`, `status` | ausentes no SQL | Demo entrega; backend não. Tela depende deles para KPIs e badges de status. |
| Resposta `resumo { saldo_atual_total, consumo_90d, consumo_180d, lead_time_medio_dias, minimo_sugerido_total, maximo_sugerido_total }` | ausente | Sem `resumo`, KPIs do topo ficam zerados. |

### Atualização única: `docs/backend-rota-movimentacao.md`

Reescrever o documento para que o backend entregue **exatamente** o contrato que a tela já consome em modo demo. Sem mudanças no frontend.

#### 1. Mapeamento de campos (SELECT ajustado)
- `CASE WHEN MVP.TIPMOV = 'E' THEN 'ENT' WHEN MVP.TIPMOV = 'S' THEN 'SAI' END AS tipo_movimento` — normaliza para `ENT`/`SAI`.
- Manter `DATMOV → data_movimento`, `QTDMOV → quantidade`, `NUMDOC → documento` com nota explícita: se o dicionário do cliente usar `DATEMI`/`QTD`/`NUMDCT`, ajustar **somente o nome da coluna** preservando o alias.
- `LEFT JOIN E140FOR FOR ON FOR.CODFOR = MVP.CODFOR` (quando `CODFOR` existir em `E210MVP`) → `FOR.NOMFOR AS fornecedor`. Se `E210MVP` não tiver fornecedor, deixar `NULL` mas documentar o JOIN alternativo via `E300NFE`/`E140FOR` em entradas.
- `MVP.CODORI AS origem` (ou `'INT'` quando ausente).

#### 2. Campos calculados por item (subquery / CTE)
Adicionar à query principal um bloco que calcule por `(CODEMP, CODPRO, CODDER, CODDEP)` em janela de 180 dias:
- `consumo_medio` = `SUM(QTDMOV WHERE TIPMOV='S' AND últimos 180d) / 180.0`.
- `lead_time_dias` = `AVG(DATEDIFF(day, data_pedido, data_entrada))` na E140IPC/E140NFE — fallback fixo de 15 se sem histórico.
- `minimo_sugerido` = `consumo_medio * lead_time_dias + (consumo_medio * 0.5 * lead_time_dias)`.
- `maximo_sugerido` = `minimo_sugerido + consumo_medio * 30`.
- `status` = `CASE WHEN saldo_atual < minimo THEN 'ABAIXO_MINIMO' WHEN saldo_atual > maximo THEN 'ACIMA_MAXIMO' ELSE 'ENTRE_MIN_E_MAX' END`.

Implementar via CTE `agregados_produto` para evitar repetição na lista paginada.

#### 3. Bloco `resumo` no response
Após o `fetchall()`, executar segunda query agregada (sem paginação, mesmos filtros exceto `data_*`) e devolver:
```json
"resumo": {
  "saldo_atual_total": 12345.0,
  "consumo_90d": 0.0,
  "consumo_180d": 0.0,
  "lead_time_medio_dias": 0.0,
  "minimo_sugerido_total": 0.0,
  "maximo_sugerido_total": 0.0
}
```
SQL pronto incluído no doc (SUM/AVG sobre a CTE `agregados_produto`).

#### 4. Atualizar `PaginatedMovimentacao` (Pydantic)
```python
class ResumoMovimentacao(BaseModel):
    saldo_atual_total: float = 0
    consumo_90d: float = 0
    consumo_180d: float = 0
    lead_time_medio_dias: float = 0
    minimo_sugerido_total: float = 0
    maximo_sugerido_total: float = 0

class PaginatedMovimentacao(BaseModel):
    pagina: int
    tamanho_pagina: int
    total_registros: int
    total_paginas: int
    dados: List[MovimentacaoItem]
    resumo: ResumoMovimentacao
```
E adicionar a `MovimentacaoItem` os campos: `consumo_medio`, `minimo_sugerido`, `maximo_sugerido`, `lead_time_dias`, `status`.

#### 5. Tabela de equivalência demo ↔ backend
Inserir no doc uma seção "Contrato canônico" com tabela lado-a-lado mostrando cada campo de `DemoMovimentacao` (em `src/lib/demoMovimentacao.ts`) e a expressão SQL correspondente — referência rápida para o dev backend validar campo a campo.

#### 6. Checklist de validação ampliado
- [ ] `tipo_movimento` retorna `'ENT'` ou `'SAI'` (nunca `'E'`/`'S'`).
- [ ] `fornecedor` populado em entradas; `null` em saídas.
- [ ] `consumo_medio`, `minimo_sugerido`, `maximo_sugerido`, `status` presentes em todas as linhas.
- [ ] Bloco `resumo` retornado mesmo quando `dados` é vazio (todos zero).
- [ ] Toggle "Usar dados de exemplo" desligado → tela renderiza KPIs e badges idênticos ao modo demo.

### Frontend
Nenhuma alteração. O contrato canônico é o que já está sendo consumido.

### Arquivos
- `docs/backend-rota-movimentacao.md` — reescrita completa com itens 1–6.

# Backend — Impressão de Ordem de Produção

Endpoint consumido pela tela `/producao/impressao-op` (frontend Lovable), que reproduz o relatório Senior **MCAP700.GER – GENIUS – Ordem de Produção p/ Operações**.

Status atual: **NÃO IMPLEMENTADO** no FastAPI. Hoje a rota responde `404 Not Found` (visível em `error_logs` do Cloud com `module = /api/producao/ordem-producao/impressao...`).

## Rota

```
GET /api/producao/ordem-producao/impressao
```

## Parâmetros (query string)

| Parâmetro            | Tipo     | Obrigatório | Observação                              |
|----------------------|----------|-------------|------------------------------------------|
| `cod_emp`            | string   | sim         | Código da empresa                        |
| `cod_ori`            | string   | sim         | Origem da OP                             |
| `num_orp`            | string   | sim         | Número da OP                             |
| `listar_componentes` | `S`/`N`  | não (def N) | Lista bloco de componentes               |
| `listar_desenho`     | `S`/`N`  | não (def N) | Inclui informação de pasta de desenho    |
| `cod_etg`            | string   | não         | Filtra operações/componentes por estágio |
| `cod_cre`            | string   | não         | Filtra operações por centro de recurso   |

### Erros esperados

- `422` quando faltar qualquer um dos obrigatórios (`cod_emp`, `cod_ori`, `num_orp`).
- `404` **somente** quando a OP de fato não existe no ERP. Não usar 404 para "rota não cadastrada".
- `500` para erros inesperados, com `detail` descritivo.

## Contrato de resposta (200)

JSON espelha `OpImpressao` em `src/lib/producao/opImpressao.ts`:

```json
{
  "cabecalho": {
    "cod_emp": "1",
    "cod_ori": "210",
    "num_orp": "86993",
    "num_orp_formatado": "000086993",
    "codigo_barras_op": "210000086993",
    "produto": "PRD-0001",
    "descricao_produto": "...",
    "unidade_medida": "PC",
    "quantidade": 10,
    "pedido": "12345",
    "inicio_previsto": "2026-05-22",
    "periodo": "2026-05",
    "situacao": "L",
    "situacao_descricao": "Liberada",
    "agrupamento": "...",
    "revisao": "00"
  },
  "componentes": [
    {
      "codigo_componente": "CMP-0001",
      "descricao_componente": "...",
      "quantidade_prevista": 2,
      "unidade_medida": "PC",
      "deposito": "01",
      "endereco": "A-01-02",
      "cod_etg": "10",
      "seq_cmp": 1,
      "codigo_barras_componente": "210000086993-001"
    }
  ],
  "operacoes": [
    {
      "cod_etg": "10",
      "descricao_estagio": "Corte",
      "seq_rot": 10,
      "cod_cre": "CR01",
      "descricao_centro_recurso": "Serra automática",
      "cod_opr": "OP001",
      "descricao_operacao": "Cortar perfil",
      "fornecedor": "",
      "servico": "",
      "descricao_servico": "",
      "tmp_unit": 1.25,
      "tmp_total": 12.5,
      "unidade_medida": "MIN",
      "codigo_barras_operacao": "210000086993-010",
      "proxima_operacao": "20",
      "narrativas": "Conferir medidas antes do corte."
    }
  ],
  "observacoes": [
    "Conferir desenho rev. 00 antes da liberação."
  ],
  "mensagem_responsabilidade": "Os apontamentos devem ser feitos no centro de recurso correspondente."
}
```

### Regras de negócio

1. **Frontend não calcula nada.** Todos os totais, formatações, código de barras e textos devem vir prontos.
2. `codigo_barras_op`, `codigo_barras_operacao`, `codigo_barras_componente` devem ser strings já no formato CODE128 (o frontend renderiza com JsBarcode).
3. Quando `listar_componentes=N`, retornar `componentes: []` (ou omitir).
4. Quando `listar_desenho=S`, garantir que componentes/operações tragam referência à pasta/arquivo de desenho dentro de `narrativas` ou de campos extras documentados aqui.
5. Filtros `cod_etg` / `cod_cre`, quando enviados, devem filtrar **operações** e **componentes** correspondentes.
6. Datas em ISO `yyyy-mm-dd` ou `dd/mm/yyyy` — o frontend normaliza para `dd/mm/yyyy`.

## Exemplo de chamada

```
GET /api/producao/ordem-producao/impressao
    ?cod_emp=1
    &cod_ori=210
    &num_orp=86993
    &listar_componentes=S
    &listar_desenho=N
```

## Como o frontend usa hoje

- Hook: `src/hooks/useImpressaoOrdemProducao.ts`
- Tipos: `src/lib/producao/opImpressao.ts`
- Tela: `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Layout de impressão: `src/components/producao/OpPrintSheet.tsx`

A tela já trata loading, erro 404 (rota inexistente x OP inexistente) e estado vazio. Basta implementar o endpoint conforme este contrato para liberar o módulo.

---

## Atualizações (Maio/2026)

### `/opcoes` — parâmetros e resposta adicionais

Parâmetros aceitos adicionalmente:

| Parâmetro  | Tipo    | Observação                                                            |
|------------|---------|-----------------------------------------------------------------------|
| `sit_orp`  | string  | Filtra OPs por situação (`A`, `L`, `F`, `E`). **Nunca** aceitar `C`. |

A resposta deve incluir o catálogo de situações **sem** `C` (Cancelada):

```json
{
  "situacoes": [
    { "sit_orp": "A", "descricao": "Aberta" },
    { "sit_orp": "L", "descricao": "Liberada" },
    { "sit_orp": "F", "descricao": "Finalizada" },
    { "sit_orp": "E", "descricao": "Encerrada" }
  ]
}
```

Cada item de `ordens_producao` deve trazer `sit_orp` e `situacao_descricao`. O backend deve manter `WHERE SitOrp <> 'C'` em todas as consultas que alimentam essa tela.

#### Filtro apenas por Origem (Maio/2026)

`/opcoes` deve aceitar chamada **somente** com `cod_emp` + `cod_ori` (sem `num_ped`, `rel_prd` ou `num_orp`) e retornar todas as OPs daquela origem (até `limite_ops`, hoje 200). Combinações válidas:

- `cod_emp` + `cod_ori`
- `cod_emp` + `cod_ori` + `sit_orp`
- `cod_emp` + `cod_ori` + `q` (busca textual)
- `cod_emp` + `cod_ori` + `num_ped` / `rel_prd`

Regras:
- `cod_ori = 100` é sempre rejeitado.
- Manter exclusão de `sit_orp = 'C'`.
- `limite_ops` aceita até 200.

#### Refinamento por Centro de Recurso e Estágio (Maio/2026)

`/opcoes` aceita `cod_cre` e `cod_etg` como filtros de refinamento livres, combináveis com qualquer filtro principal ou usados sozinhos. Quando `cod_cre` está presente, retornar apenas OPs que possuam **alguma operação** em `E900OOP.CodCre = :cod_cre` (idem para `cod_etg`).

Combinações válidas (exemplos):

- `cod_emp` + `cod_cre`
- `cod_emp` + `cod_ori` + `cod_cre`
- `cod_emp` + `num_ped` + `cod_cre`
- `cod_emp` + `rel_prd` + `cod_cre`
- `cod_emp` + `sit_orp` + `cod_cre`
- `cod_emp` + `cod_etg` + `cod_cre`

Regras adicionais: continua excluindo `cod_ori = 100` e `sit_orp = 'C'`. Não selecionar OP automaticamente.

### `/impressao/lote` — impressão em lote

```
GET /api/producao/ordem-producao/impressao/lote
```

Parâmetros:

| Parâmetro            | Tipo    | Obrigatório | Observação                                       |
|----------------------|---------|-------------|--------------------------------------------------|
| `cod_emp`            | int     | sim         | Empresa                                          |
| `cod_ori`            | string  | um deles    | Imprime todas as OPs da origem                   |
| `num_ped`            | string  | um deles    | Imprime todas as OPs do pedido                   |
| `rel_prd`            | string  | um deles    | Imprime todas as OPs do relatório de produção    |
| `cod_cre`            | string  | um deles    | Imprime todas as OPs com operação nesse CR       |
| `sit_orp`            | string  | não         | Restringe por situação (nunca `C`)              |
| `cod_etg`            | string  | não         | Refina por estágio (combinável com qualquer um) |
| `listar_componentes` | `S`/`N` | não (def S) |                                                  |
| `listar_desenho`     | `S`/`N` | não (def N) |                                                  |

Pelo menos um entre `cod_ori`, `num_ped`, `rel_prd` ou `cod_cre` é obrigatório. Podem ser combinados livremente (ex.: `num_ped` + `cod_cre`, `rel_prd` + `cod_cre`, `cod_ori` + `cod_cre` + `cod_etg`).


Resposta:

```json
{
  "quantidade_ops": 3,
  "ordens": [ { /* OpImpressao */ }, { /* OpImpressao */ }, { /* OpImpressao */ } ]
}
```

Regras:

- Excluir OPs com `sit_orp = 'C'`.
- Excluir OPs com `cod_ori = 100`.
- Cada item segue exatamente o contrato de `/impressao` (cabeçalho, componentes, operações, observações).


---

## Atualizações (Mai/2026 — pacote OP)

### Cabeçalho

Campos adicionais/explicitos no `cabecalho`:

```json
{
  "revisao": "A",
  "derivacao": "U",
  "produto": "210005693",
  "descricao": "DESCRIÇÃO DO PRODUTO",
  "produto_descricao": "210005693 - DESCRIÇÃO DO PRODUTO"
}
```

- `revisao`: número/letra real da revisão da estrutura. Nunca devolver a string fixa `"REV"`.
- `derivacao`: derivação da OP (ex.: `E900QDO.CodDer`). Frontend exibe como `Derivação: <valor>` ou `-`.
- `produto` e `descricao` devem vir **separados**. `produto_descricao` é opcional e mantido para compatibilidade.

### Operações — tempos formatados

Cada item de `operacoes[]` deve incluir os campos formatados:

```json
{
  "tmp_unit": 0.3,
  "tmp_total": 0.6,
  "tmp_unit_formatado": "18 min",
  "tmp_total_formatado": "36 min"
}
```

Função sugerida no backend:

```python
def formatar_tempo_decimal_horas(valor):
    try:
        horas_dec = float(valor or 0)
    except Exception:
        return ""
    minutos_total = round(horas_dec * 60)
    if minutos_total < 60:
        return f"{minutos_total} min"
    horas = minutos_total // 60
    minutos = minutos_total % 60
    if minutos == 0:
        return f"{horas} h"
    return f"{horas} h {minutos} min"
```

O frontend usa `tmp_unit_formatado || tmp_unit` (idem total) e renderiza maior/negrito.

### Desenhos — A4 retrato pronto para impressão

Novo endpoint:

```
GET /api/producao/ordem-producao/desenho/impressao-a4?arquivo=<nome>
```

Deve retornar **sempre** o arquivo pronto em A4 retrato:

1. JPG/PNG: se largura > altura, rotacionar 90°; embarcar/converter em A4 retrato.
2. PDF: para cada página em paisagem, rotacionar/encaixar em A4 retrato; devolver PDF final padronizado.

No bloco `desenhos[]` do `/impressao`, cada item deve trazer:

```json
{
  "nome_arquivo": "210005693.pdf",
  "tipo": "PDF",
  "url": "/api/producao/ordem-producao/desenho?arquivo=210005693.pdf",
  "url_impressao": "/api/producao/ordem-producao/desenho/impressao-a4?arquivo=210005693.pdf",
  "layout_impressao": "A4_RETRATO",
  "rotacao_automatica": true
}
```

Regra no frontend (já implementada): `url_impressao || url`. Quando `url_impressao` existir, o Lovable **não aplica rotação CSS** — confia que o backend já entregou pronto.

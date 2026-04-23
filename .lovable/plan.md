

## Corrigir nomes de campos: dados de Início/Fim e horas não aparecem

### Diagnóstico
A tela `/auditoria-apontamento-genius` lê os campos `hora_inicial`, `hora_final`, `data_movimento`, `horas_realizadas` e `total_horas_dia_operador`, mas o backend documentado em `docs/backend-auditoria-apontamento-genius.md` retorna:

| Backend (atual) | Código (esperando) |
|---|---|
| `data` | `data_movimento` |
| `hora_inicio` | `hora_inicial` |
| `hora_fim` | `hora_final` |
| `horas_apontadas` | `horas_realizadas` |
| `total_dia_operador` | `total_horas_dia_operador` |
| `operador` | `nome_operador` / `numcad` |
| `status` | `status_movimento` |
| `status_op` | `sitorp` |

Como nenhuma camada de normalização existe entre `api.get(...)` e o componente, **todos** os valores caem em `undefined`. Isso explica:
- Início e Fim mostrando vazio / "Sem início" / "Sem fim" para todas as linhas;
- Horas apontadas zeradas;
- KPIs de discrepância contando linhas erradas.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Adicionar normalizador único `normalizeRowApont(raw)`**

Função que recebe o item bruto da API e devolve um `RowApont` com os nomes que o resto da página já usa, fazendo fallback para os nomes antigos (caso o backend mude no futuro):

```ts
function normalizeRowApont(r: any): RowApont {
  const horasApontadas = r.horas_apontadas ?? r.horas_realizadas ?? 0;
  return {
    ...r,
    data_movimento:            r.data_movimento ?? r.data ?? r.data_apontamento ?? null,
    hora_inicial:              r.hora_inicial ?? r.hora_inicio ?? null,
    hora_final:                r.hora_final ?? r.hora_fim ?? null,
    // backend devolve em HORAS (decimal); a página trata em MINUTOS — converter:
    horas_realizadas:          typeof horasApontadas === 'number' && r.horas_apontadas != null
                                  ? Math.round(horasApontadas * 60)
                                  : (r.horas_realizadas ?? 0),
    total_horas_dia_operador:  r.total_horas_dia_operador
                                  ?? (r.total_dia_operador != null ? Math.round(Number(r.total_dia_operador) * 60) : 0),
    nome_operador:             r.nome_operador ?? r.operador ?? '',
    numcad:                    r.numcad ?? r.codigo_operador ?? r.operador ?? '',
    status_movimento:          r.status_movimento ?? r.status ?? 'FECHADO',
    sitorp:                    r.sitorp ?? r.status_op ?? '',
    centro_trabalho:           r.centro_trabalho ?? r.codigo_centro_trabalho ?? r.estagio ?? '',
    estagio:                   r.estagio ?? r.operacao ?? '',
    numero_op:                 r.numero_op ?? r.numop ?? '',
    codigo_produto:            r.codigo_produto ?? r.codpro ?? '',
    descricao_produto:         r.descricao_produto ?? r.despro ?? '',
    origem:                    r.origem ?? r.codori ?? '',
  };
}
```

**Observação importante sobre unidade**: o doc do backend mostra `horas_apontadas: 9.25` (decimal em **horas**). A página inteira trata como **minutos** (regras `> 480`, `< 5`, `minToHours`). A normalização converte horas→minutos no momento da leitura, mantendo o resto do código intacto.

**2. Aplicar a normalização logo após o `api.get(...)`**

Em `loadData` (linha ~385):
```ts
const result = await api.get<AuditoriaApontamentoGeniusResponse>('/api/apontamentos-producao', { ... });
result.dados = (result.dados ?? []).map(normalizeRowApont);
setData(result);
```

Com isso, todos os pontos da tela (KPIs, tabela principal, drill genérico, `OpLinhasInline`, drawer da OP, sumário, exportação para clipboard etc.) passam a ler campos preenchidos sem alterações adicionais.

**3. Sanity-check pós-normalização**

Adicionar (apenas em DEV) um `console.debug` resumindo a primeira linha normalizada para o usuário poder confirmar pelo console que `data_movimento`, `hora_inicial`, `hora_final` e `horas_realizadas` chegaram preenchidos.

### Fora de escopo
- Renomear todas as referências internas para `data` / `hora_inicio` / `hora_fim` (mudaria 200+ linhas; a normalização resolve com 1 função).
- Alterar contrato do backend ou exportação `.xlsx`.
- Mudar a regra de unidades (a página continua trabalhando em minutos internamente).

### Resultado
Após aplicar o normalizador:
- Coluna **Início (data + hora)** e **Fim (data + hora)** do `OpLinhasInline` e do drawer da OP mostram corretamente data + hora;
- Coluna **Apontado (min · h)** mostra valores corretos;
- Cards "Sem Início", "Sem Fim", "Fim < Início", "Acima de 8h", "Abaixo de 5 min" deixam de contar linhas erradas;
- Resumo da OP mostra período e total apontado consistentes.


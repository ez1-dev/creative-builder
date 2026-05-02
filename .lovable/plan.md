## Objetivo

Eliminar TODOS os rótulos no formato `(TABELA.CAMPO)` que ainda aparecem na tela **SGU › Preview por campo**, mapeando os ~250 códigos técnicos restantes das tabelas `E099USU`, `E099CPR`, `E099FIN`, `E099GCO`, `E099UCP`, `E099UDE`, `E099UVE`.

## Arquivo único alterado

`src/lib/erpFieldLabels.ts` — apenas expansão dos mapas `BY_TABLE.*`. Sem mudanças de lógica.

## Mapeamento por tabela

### E099USU — parâmetros do usuário SGU (Senior Gestão Empresarial)

Os prefixos seguem o padrão Senior:
- **VEN\*** = permissões de Vendas (Pedidos, Orçamentos, Notas)
- **CPR\*** = permissões de Compras
- **EST\*** = Estoque
- **REC\*** = Contas a Receber
- **PAG\*** = Contas a Pagar
- **CXB\*** = Caixa/Bancos
- **CTB\*** = Contabilidade
- **PRD\*** = Produção
- **AST\*** = Ativos
- **MPC\*** = Movimentação de Produtos/Custos
- **CLE\*** = Clientes
- **APR\*** = Aprovação
- **OBSMO\*** = Observações móveis

Exemplos de mapeamentos a adicionar (lista resumida — total ~180 entradas em E099USU):

```
SUPIME: 'Superior Imediato'
VENNSP: 'Vendas — Não Sugere Preço'
VENPAR: 'Vendas — Permite Alterar Rateio'
VENPAP, VENPDS, VENPIP, VENPIC, VENPCO, VENPIS, VENPIR, VENPIN, VENPFU:
  'Vendas — Permite alterar [Preço/Desconto/IPI/ICMS/Comissão/IS/IR/IN/Frete Unitário]'
VENAUN: 'Vendas — Altera Unidade'
VENATP: 'Vendas — Altera Tipo de Pedido'
VENACL, VENARE, VENASP, VENLPD, VENACV, VENANS, VENLNS, VENASR:
  'Vendas — [Altera Cliente/Representante/...]'
VENRAT, VENPAE, VENADG, VENAPI: 'Vendas — Rateio/Pedido Aberto/Desconto Geral/Pedido Importado'
ESTAES, ESTRAT, ESTPLP: 'Estoque — Altera Empresa/Rateio/Plano'
RECPGR, RECAVR, RECAVL, RECRAT: 'Receber — Pago/Avulso/Rateio'
CPRMAC, CPRMOC: 'Compras — Máximo Aprovação/OC'
CPRPAP..CPRPFU, CPRVNO, CPRQNO, CPRVDN, CPRPDN: 'Compras — limites e permissões'
CPRAPD, CPRAFO, CPRAOC, CPRACC, CPRANE, CPRRAT, CPRADG, CPRACF, CPRATX, CPRAHF
PAGMAX, PAGPGR, PAGAVP, PAGAVL, PAGEEV, PAGRAT, PAGARF, PAGACD, PAGDET, PAGABA, PAGAJR, PAGAML, PAGAEN, PAGACR, PAGAAC, PAGASC, PAGADE, PAGALQ, PAGMOE, PAGALT
CXBDCP, CXBAPM, CXBRAT, CXBARF, CXBBLO, CXBPGP
CTBDAC, CTBALT, CTBCLT, CTBALC, CTBCLC, CTBART, CTBCRT, CTBAOR, CTBCOR, CTBACT, CTBAHP, CTBACF, CTBLFL, CTBZER, CTBELT, CTBELC, CTBLTC
PRDDPA, PRDDPP, PRDEPB, PRDOPD
SITUSU: 'Situação do Usuário (A=Ativo)'
CODMOT, OBSMOT, USUMOT, DATMOT, HORMOT: 'Motivo de bloqueio/inativação'
USUGER, DATGER, HORGER: 'Auditoria — geração'
CODPOR, NOMSER, PORSER: 'Porta/Servidor'
AUTUSU, USUAUT, SENAUT: 'Autenticação adicional'
ALTREM, ALTMON, ALTEBQ, ALTINP, ALTNNU: 'Permissões de alteração'
MLTLGN, MAXLGN: 'Múltiplo login / máximo'
PATDFL, PATEMP, PATTDE: 'Patrimônio — defaults'
DISRRA, DISINR, DISENR: 'Distribuição rateio'
APRDFT, APRDOC, APRSCT, SENAPR: 'Aprovação'
PRJLFD, PRJNUS, PRJTSO: 'Projetos'
USUCFE, CONQAR, CONREC, CONAGE, MANAGE: 'Consultas/Conciliação'
DATSIN, HORSIN: 'Sincronização'
CPOCPF, CLEQTD, CLEPRC: 'Clientes — CPF/Quantidade/Preço'
COBPDJ, COBATC: 'Cobrança PDJ/Automática'
ACRCCM, PEREXS, PERFPC, PERACF, PERUNI, PERCNL: 'Permissões diversas'
INDANT, INDPON, INDQGO, INDAST, INDMRE: 'Indicadores'
SIMFEC, EXAOCP, REPVAR, PRPOCP: 'Outros'
TURTRB, CODCEL, OPDORP, DIRCTE, DIRNES, DIRNEL, DIRMDF: 'Turno/Diretórios'
CANNFE, DATAFI, PARESP: 'NF-e/Diário Fiscal/Especial'
ACEHRY, REPFIX: 'Aceita hierarquia / Repete fixo'
OBSMOB, OBSMOL, OBSMOR: 'Observações móveis (B/L/R)'
VENCPD, VENRPD, VENCNP, VENCNS, VENRNS, VENSCV, VENSDG, VENSPP, VENPTN, VENPCA,
  VENPCD, VENPSE, VENPFP, VENPOF, VENLPV, VENLPF, VENLPC, VENLPP, VENLPI, VENLPA,
  VENLCE, VENATV, VENATF, VENAVA, VENAIR, VENASE, VENIFC, VENCST, VENFQP
CPRPQT, CPRPSC, CPRPEC, CPRPOS, CPRPSE, CPRFOC, CPRFCP, CPRFPO, CPRSCC, CPRRCA,
  CPRIGC, CPRASC, CPRAQC, CPRBLO, CPRCST, CPRAPI
ASTORP, ASTSOR, ASTNFV, ASTPED, ASTPSI, ASTETO
MPCACT, MPCACF, MPCACC, MPCACA
ESTGSA, ESTADR, ESTAGC
PATEMP, PATTDE
REBNFI, IMPRAT, AUDPFA
USU_APRQUAL: 'Aprovador Qualidade'
```

(implementação real terá rótulos completos em PT-BR para cada código).

### E099CPR — Compradores
```
DEMITR: 'Comprador Demitido'
ALTCTR: 'Altera Contrato'
ALTPDT: 'Altera Pedido'
AUTMDE: 'Autoriza Modo Direto Empresa'
PERAGR: 'Permite Agrupamento'
```

### E099FIN — Restrições financeiras (PAG\*/REC\* = permite alterar X em pagar/receber)
```
PAGALT: 'Pagar — Tipo de Alteração (T=Total/P=Parcial)'
PAGABA, PAGAJR, PAGAML, PAGAEN, PAGACR, PAGAAC, PAGASC, PAGADE, PAGALQ, PAGMOE
RECABA, RECAJR, RECAML, RECAEN, RECACR, RECAAC, RECASC, RECADE, RECALQ, RECMOE
PERGDS: 'Permite Gerar Desconto'
CXBBLO: 'Bloqueia Caixa/Banco'
MAIPAR: 'Maior Parcial'
ENTREN: 'Entrada/Renegociação'
BAIPER: 'Baixa Permitida'
MOVLOJ: 'Movimentação Loja'
```

### E099GCO — Grupos de contas
```
CONACE: 'Conta com Acesso'
USUGER, DATGER, HORGER: 'Auditoria — geração'
USUALT, DATALT, HORALT: 'Auditoria — alteração'
```

### E099UCP — Usuário × Centro Custo/Projeto
```
ALTTCP: 'Altera Tipo CC/Projeto'
OPCCTR: 'Opção de Contrato (A=Ambos)'
USUGER, DATGER, HORGER, USUALT, DATALT, HORALT
REPFIX: 'Repete Fixo'
ACEHRY: 'Aceita Hierarquia'
```

### E099UDE — Usuário × Departamento
```
DBUNFE: 'Débito NF Entrada'
DBUNFS: 'Débito NF Saída'
DBUCTE: 'Débito Conta Específica'
USUGER, DATGER, HORGER, USUALT, DATALT, HORALT
```

### E099USE — Usuário × Empresa/Filial
```
DESXTD: 'Descrição Estendida'
```

### E099UVE — Usuário × Vendedor
```
ALTTVE: 'Altera Tipo de Vendedor'
PEREPS: 'Permite Empresa Personalizada'
USUGER, DATGER, HORGER, USUALT, DATALT, HORALT
CODAGR: 'Código de Agregação'
ENVRSG: 'Envia Resgate'
```

## Observações

- Onde o sentido exato de um código não é documentado publicamente pela Senior (ex.: `MPCACA`, `ASTPSI`, `OBSMOB`), uso uma tradução literal do prefixo + sufixo (ex.: "Mov. Produtos — Altera Custo Apropriado", "Ativo — PSI", "Obs. Móvel — Bloqueia") para que pelo menos o operador veja algo legível em português ao invés do código bruto. Isto é melhor que `(E099USU.MPCACA)`.
- Mantenho o fallback `(TABELA.CAMPO)` no `getFieldLabel` — assim, se aparecer algum novo campo no futuro, ainda é visível para reportar.
- Nenhuma alteração de lógica, componentes ou backend. Apenas dados.

## Resultado esperado

Após o deploy, na tela SGU › Preview por campo, **nenhuma linha** das tabelas listadas deve mostrar o formato `(E099XXX.YYY)` na coluna Descrição.

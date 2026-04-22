

## Atalho "Últimos 12 meses" no filtro de datas

### Escopo
Adicionar um botão de atalho no painel de filtros da tela `/auditoria-apontamento-genius` que preenche automaticamente:
- `data_ini` = hoje − 12 meses
- `data_fim` = hoje

Não dispara busca automática — apenas preenche os campos. O usuário ainda clica em "Pesquisar" para consultar (mantém o padrão de comportamento de filtros do app).

### Onde
Arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`.

Inserir o botão **ao lado dos campos de data inicial/final** dentro do `FilterPanel`, usando `Button` variant `outline` size `sm` com ícone `CalendarRange` (lucide-react) e label "Últimos 12 meses".

### Lógica
```ts
const handleUltimos12Meses = () => {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 12);
  setFilters(prev => ({
    ...prev,
    data_ini: inicio.toISOString().slice(0, 10),
    data_fim: hoje.toISOString().slice(0, 10),
  }));
};
```

Formato `YYYY-MM-DD` para bater com o que o backend já recebe nos filtros atuais.

### UX
- Botão pequeno, discreto, alinhado à direita dos dois inputs de data.
- Tooltip opcional: "Preenche o intervalo dos últimos 12 meses".
- Não substitui os inputs nem altera defaults iniciais da tela.

### Fora de escopo
- Não cria outros atalhos (30 dias, este mês, etc.) — só o pedido.
- Não altera backend nem contrato da API.
- Não dispara busca automática.

### Resultado
Um clique no botão "Últimos 12 meses" preenche `data_ini` e `data_fim` com o intervalo correto, e o usuário aciona "Pesquisar" normalmente.


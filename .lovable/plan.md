

# Renomear menus do sidebar

## Alteração
Atualizar os títulos no array `modules` em `src/components/AppSidebar.tsx`:

| Atual | Novo |
|-------|------|
| Estoque | Consulta de Estoques |
| Onde Usa | Consulta Onde Usa |
| Estrutura (BOM) | Estrutura BOM |
| Compras / Custos | Consulta Compras/Custos |
| Painel de Compras | Painel de Compras |
| Eng. x Produção | Eng. x Produção |
| Auditoria Tributária | Auditoria Tributária |
| Conciliação EDocs | Conciliação EDocs |
| NF Recebimento | Consulta NF Receb. |
| Reserva Nº Série | Reserva Nº Série |
| Configurações | Configurações |

## Arquivo afetado
- `src/components/AppSidebar.tsx` — apenas o array `modules` (linhas 22-32)

Alguns nomes foram abreviados para caber bem no sidebar quando colapsado/expandido. Nomes que já são claros (Painel de Compras, Auditoria Tributária, etc.) permanecem iguais.


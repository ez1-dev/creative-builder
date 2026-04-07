

# Adicionar data/hora e localização no cabeçalho

## Análise
Sim, é pertinente e agrega valor para um sistema ERP — ajuda o usuário a confirmar fuso horário, data da sessão e contexto de acesso. Muitos ERPs corporativos exibem isso.

## O que será adicionado
No lado esquerdo do header (ao lado do SidebarTrigger), exibir:

```text
┌──────────────────────────────────────────────────────────────────┐
│ ☰  📅 Seg, 07/04/2026 · 🕐 14:32 · 📍 São Paulo, BR    Olá, João  Sair │
└──────────────────────────────────────────────────────────────────┘
```

| Info | Fonte | Ícone |
|------|-------|-------|
| Data por extenso (dia semana + dd/mm/aaaa) | `Intl.DateTimeFormat('pt-BR')` | Calendar |
| Hora atual (atualiza a cada minuto) | `setInterval` 60s | Clock |
| Cidade + País | API `navigator.geolocation` + reverse geocoding via API gratuita, **ou** simplesmente o fuso horário do browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`) como fallback sem necessidade de permissão | MapPin |

## Detalhes técnicos

### `src/components/HeaderInfo.tsx` (novo)
- Componente leve com `useState` + `useEffect` para relógio atualizado a cada 60s
- Localização via `Intl.DateTimeFormat().resolvedOptions().timeZone` (ex: "America/Sao_Paulo" → formatado como "São Paulo, BR") — sem pedir permissão de GPS
- Estilo: `text-xs text-muted-foreground` com ícones Lucide pequenos (3×3)

### `src/components/AppLayout.tsx`
- Importar `HeaderInfo` e posicionar ao lado do `SidebarTrigger` no header

## Escopo
- 1 arquivo novo, 1 arquivo editado
- Sem dependências externas, sem chamadas de API externa
- Fuso horário inferido do browser (não requer geolocalização)


## Ajuste do quadro REV — Impressão de OP

Alterar somente o conteúdo do quadro REV em `src/components/producao/OpPrintSheet.tsx` (linhas 107-120) e o tipo do cabeçalho em `src/lib/producao/opImpressao.ts`.

### 1) `src/lib/producao/opImpressao.ts`

Adicionar à interface `OpCabecalho`:

```ts
revisao_modelo?: string | number;
revisao_roteiro?: string | number;
revisao_label?: string;
```

(Mantém `revisao` existente para retrocompat.)

### 2) `src/components/producao/OpPrintSheet.tsx`

Substituir a primeira célula do `op-rev-stack` (que hoje mostra "Rev" + valor único) por um bloco com título "REV" e duas linhas: MOD e ROT. A segunda célula (Agrupamento) permanece inalterada.

```tsx
<div className="op-rev-stack">
  <div className="op-rev-cell">
    <div className="lbl">Rev</div>
    <div className="val" style={{ fontSize: '10px', lineHeight: 1.3 }}>
      <div>MOD {String(cab.revisao_modelo ?? '').trim() || '-'}</div>
      <div>ROT {String(cab.revisao_roteiro ?? '').trim() || '-'}</div>
    </div>
  </div>
  <div className="op-rev-cell">
    <div className="lbl">Agrupamento</div>
    <div className="val">{cab.agrupamento ?? '-'}</div>
  </div>
</div>
```

### Observações

- Não altera CSS (`op-print.css`), cabeçalho, componentes, operações nem desenhos.
- Remove uso de `cab.revisao` e o fallback que gerava "REV REV".
- Posição do quadro REV preservada (mesma estrutura `op-rev-stack`).

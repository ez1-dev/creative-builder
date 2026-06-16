## Checkbox "É manutenção/reforma?" no Manter GS

Ajustes em `src/pages/NumeroSeriePage.tsx`, seção **OP Complementar — Manter GS**.

### 1. Estado
Adicionar novo estado, junto aos demais `opc*` (linha ~213):

```ts
const [opcManutencao, setOpcManutencaoRaw] = useState(false);
const setOpcManutencao = (v: boolean) => { setOpcManutencaoRaw(v); invalidarSimulacao(); };
```

Invalida a simulação ao trocar (mesma regra dos outros campos), porque o payload muda.

### 2. UI
Logo acima do bloco da Justificativa (linha ~867), inserir:

```
[ ] É manutenção/reforma?
    Marque quando o GS está sendo reaproveitado porque a máquina/equipamento
    está em manutenção ou reforma. Libera o vínculo do mesmo GS em produto
    diferente sem precisar de "Forçar vínculo".
```

Componente: `Checkbox` (shadcn) + `Label` clicável, classes do design system (sem cores hardcoded). Quando marcado, sugere automaticamente a justificativa padrão se o campo estiver vazio:

> "Máquina em manutenção/reforma. Reaproveitamento controlado do mesmo GS na OP complementar."

(Apenas pré-preenche; usuário pode editar.)

### 3. Payload em `executarOpComplementar` (linha ~656)
Acrescentar ao `body`:

```ts
manutencao: opcManutencao,
tipo_vinculo: opcManutencao ? 'MANUTENCAO' : 'NORMAL',
permitir_mesmo_gs_outro_produto: opcManutencao,
```

Vale tanto para `simular` quanto para `manter-gs` — o backend usa os mesmos campos para decidir se libera o reaproveitamento em produto diferente.

### 4. Aviso visual
Quando `opcManutencao === true`, mostrar badge/alerta informativo discreto perto do botão:

> "Modo manutenção/reforma — o mesmo GS poderá ser vinculado a um produto/derivação diferente."

### 5. Documentação
Atualizar `docs/backend-numero-serie-gs-historico.md` (ou criar `docs/backend-numero-serie-manter-gs-manutencao.md`) descrevendo os 3 novos campos do request: `manutencao`, `tipo_vinculo` (`NORMAL`|`MANUTENCAO`), `permitir_mesmo_gs_outro_produto`, e a regra: quando `manutencao=true`, não exigir `forcar_vinculo` mesmo se o GS aparecer em produto diferente.

### Fora de escopo
- Backend FastAPI (precisa aceitar/validar os novos campos).
- Demais seções da página (Reservar / Histórico).

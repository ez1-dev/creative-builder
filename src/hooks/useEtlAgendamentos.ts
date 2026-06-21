import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarAgendamentos,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  dispararTickAgendador,
  type EtlAgendamento,
  type EtlAgendamentoInput,
} from '@/lib/etl/agendamentosApi';

const KEY = ['etl-agendamentos'];

export function useEtlAgendamentos() {
  return useQuery<EtlAgendamento[]>({
    queryKey: KEY,
    queryFn: listarAgendamentos,
    staleTime: 30_000,
  });
}

export function useEtlAgendamentosMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const criar = useMutation({
    mutationFn: (input: EtlAgendamentoInput) => criarAgendamento(input),
    onSuccess: invalidate,
  });
  const atualizar = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<EtlAgendamentoInput> & { ativo?: boolean } }) =>
      atualizarAgendamento(id, patch),
    onSuccess: invalidate,
  });
  const excluir = useMutation({
    mutationFn: (id: string) => excluirAgendamento(id),
    onSuccess: invalidate,
  });
  const tick = useMutation({
    mutationFn: () => dispararTickAgendador(),
    onSuccess: invalidate,
  });

  return { criar, atualizar, excluir, tick };
}

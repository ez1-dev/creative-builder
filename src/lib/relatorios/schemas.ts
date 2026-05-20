import { z } from 'zod';

export const relatorioFormSchema = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório').max(120, 'Máx. 120 caracteres'),
  descricao: z.string().trim().max(1000, 'Máx. 1000 caracteres').optional().nullable(),
  modulo: z.string().trim().max(60).optional().nullable(),
  categoria: z.string().trim().max(60).optional().nullable(),
  fonte_dados: z.string().trim().max(120).optional().nullable(),
  status: z.enum(['rascunho', 'publicado', 'inativo']),
  permite_excel: z.boolean(),
  permite_pdf: z.boolean(),
  permite_csv: z.boolean(),
  tipo_fonte: z.enum(['sql', 'api_rest']),
  endpoint_url: z.string().trim().max(300).optional().nullable(),
  url_destino: z.string().trim().max(300).optional().nullable(),
});

export type RelatorioFormValues = z.infer<typeof relatorioFormSchema>;

export const parametroSchema = z.object({
  nome: z.string().trim().min(1).max(60).regex(/^[a-z_][a-z0-9_]*$/i, 'Use apenas letras, números e _'),
  label: z.string().trim().max(120).optional().nullable(),
  tipo: z.enum(['texto', 'numero', 'data', 'lista', 'booleano']),
  obrigatorio: z.boolean(),
  valor_padrao: z.string().max(500).optional().nullable(),
  ordem: z.number().int().min(0),
  sql_lista: z.string().max(5000).optional().nullable(),
});

export function slugifyCodigo(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50) || 'relatorio';
}

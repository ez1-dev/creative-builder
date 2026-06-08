export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_profiles: {
        Row: {
          ai_enabled: boolean
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          ai_enabled?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          ai_enabled?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bi_centros_custo: {
        Row: {
          codigo: string
          descricao: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          descricao?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          descricao?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_cliente: {
        Row: {
          atualizado_em: string
          cd_cliente: string
          nm_cliente: string | null
          nm_fantasia: string | null
        }
        Insert: {
          atualizado_em?: string
          cd_cliente: string
          nm_cliente?: string | null
          nm_fantasia?: string | null
        }
        Update: {
          atualizado_em?: string
          cd_cliente?: string
          nm_cliente?: string | null
          nm_fantasia?: string | null
        }
        Relationships: []
      }
      bi_compras: {
        Row: {
          centro_custo: string | null
          codigo_familia: string | null
          codigo_fornecedor: string | null
          codigo_item: string | null
          codigo_motivo_oc: string | null
          condicao_pagamento: string | null
          data_emissao: string | null
          data_entrega: string | null
          descricao_item: string | null
          erp_updated_at: string | null
          etl_updated_at: string
          id: string
          mes_competencia: string | null
          nome_fornecedor: string | null
          nome_projeto: string | null
          numero_oc: string
          numero_projeto: string | null
          observacao_oc: string | null
          origem_material: string | null
          preco_unitario: number | null
          projeto_macro: string | null
          quantidade: number | null
          quantidade_recebida: number | null
          saldo_pendente: number | null
          sequencia_item: number
          situacao_oc: string | null
          tipo_despesa: string | null
          tipo_despesa_calc: string | null
          tipo_item: string | null
          valor_bruto: number | null
          valor_liquido: number | null
          valor_pendente: number | null
          valor_recebido: number | null
        }
        Insert: {
          centro_custo?: string | null
          codigo_familia?: string | null
          codigo_fornecedor?: string | null
          codigo_item?: string | null
          codigo_motivo_oc?: string | null
          condicao_pagamento?: string | null
          data_emissao?: string | null
          data_entrega?: string | null
          descricao_item?: string | null
          erp_updated_at?: string | null
          etl_updated_at?: string
          id?: string
          mes_competencia?: string | null
          nome_fornecedor?: string | null
          nome_projeto?: string | null
          numero_oc: string
          numero_projeto?: string | null
          observacao_oc?: string | null
          origem_material?: string | null
          preco_unitario?: number | null
          projeto_macro?: string | null
          quantidade?: number | null
          quantidade_recebida?: number | null
          saldo_pendente?: number | null
          sequencia_item: number
          situacao_oc?: string | null
          tipo_despesa?: string | null
          tipo_despesa_calc?: string | null
          tipo_item?: string | null
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_pendente?: number | null
          valor_recebido?: number | null
        }
        Update: {
          centro_custo?: string | null
          codigo_familia?: string | null
          codigo_fornecedor?: string | null
          codigo_item?: string | null
          codigo_motivo_oc?: string | null
          condicao_pagamento?: string | null
          data_emissao?: string | null
          data_entrega?: string | null
          descricao_item?: string | null
          erp_updated_at?: string | null
          etl_updated_at?: string
          id?: string
          mes_competencia?: string | null
          nome_fornecedor?: string | null
          nome_projeto?: string | null
          numero_oc?: string
          numero_projeto?: string | null
          observacao_oc?: string | null
          origem_material?: string | null
          preco_unitario?: number | null
          projeto_macro?: string | null
          quantidade?: number | null
          quantidade_recebida?: number | null
          saldo_pendente?: number | null
          sequencia_item?: number
          situacao_oc?: string | null
          tipo_despesa?: string | null
          tipo_despesa_calc?: string | null
          tipo_item?: string | null
          valor_bruto?: number | null
          valor_liquido?: number | null
          valor_pendente?: number | null
          valor_recebido?: number | null
        }
        Relationships: []
      }
      bi_faturamento: {
        Row: {
          ano_emissao: string | null
          anomes_emissao: string | null
          atualizado_em: string
          carga_id: string | null
          cd_agrupamento: string | null
          cd_centro_custos: string | null
          cd_centro_custos_1: string | null
          cd_centro_custos_2: string | null
          cd_centro_custos_3: string | null
          cd_cidade: string | null
          cd_cif_fob: string | null
          cd_cliente: string | null
          cd_derivacao: string | null
          cd_empresa: string | null
          cd_estado: string | null
          cd_familia: string | null
          cd_filial: string | null
          cd_fpj: string | null
          cd_grupo_cliente: string | null
          cd_natureza: string | null
          cd_nf: string | null
          cd_origem: string | null
          cd_pedido: string | null
          cd_prj: string | null
          cd_produto: string | null
          cd_representante: string | null
          cd_rev_pedido: string | null
          cd_serie: string | null
          cd_tns: string | null
          cd_tp_movimento: string | null
          cd_transportadora: string | null
          cd_unidade_medida: string | null
          dia_emissao: string | null
          ds_abr_fpj: string | null
          ds_abr_prj: string | null
          dt_emissao: string | null
          fonte_acao: string | null
          id: string
          id_nf: string | null
          mes_emissao: string | null
          qtd_produtos: number | null
          vl_amostra: number | null
          vl_bonificacao: number | null
          vl_bruto: number | null
          vl_cofins: number | null
          vl_comissao: number | null
          vl_custo: number | null
          vl_desconto: number | null
          vl_devolucao: number | null
          vl_difal: number | null
          vl_frete: number | null
          vl_icms: number | null
          vl_ipi: number | null
          vl_ismsst: number | null
          vl_iss: number | null
          vl_meta: number | null
          vl_peso_bruto: number | null
          vl_peso_liquido: number | null
          vl_pis: number | null
          vl_total: number | null
        }
        Insert: {
          ano_emissao?: string | null
          anomes_emissao?: string | null
          atualizado_em?: string
          carga_id?: string | null
          cd_agrupamento?: string | null
          cd_centro_custos?: string | null
          cd_centro_custos_1?: string | null
          cd_centro_custos_2?: string | null
          cd_centro_custos_3?: string | null
          cd_cidade?: string | null
          cd_cif_fob?: string | null
          cd_cliente?: string | null
          cd_derivacao?: string | null
          cd_empresa?: string | null
          cd_estado?: string | null
          cd_familia?: string | null
          cd_filial?: string | null
          cd_fpj?: string | null
          cd_grupo_cliente?: string | null
          cd_natureza?: string | null
          cd_nf?: string | null
          cd_origem?: string | null
          cd_pedido?: string | null
          cd_prj?: string | null
          cd_produto?: string | null
          cd_representante?: string | null
          cd_rev_pedido?: string | null
          cd_serie?: string | null
          cd_tns?: string | null
          cd_tp_movimento?: string | null
          cd_transportadora?: string | null
          cd_unidade_medida?: string | null
          dia_emissao?: string | null
          ds_abr_fpj?: string | null
          ds_abr_prj?: string | null
          dt_emissao?: string | null
          fonte_acao?: string | null
          id: string
          id_nf?: string | null
          mes_emissao?: string | null
          qtd_produtos?: number | null
          vl_amostra?: number | null
          vl_bonificacao?: number | null
          vl_bruto?: number | null
          vl_cofins?: number | null
          vl_comissao?: number | null
          vl_custo?: number | null
          vl_desconto?: number | null
          vl_devolucao?: number | null
          vl_difal?: number | null
          vl_frete?: number | null
          vl_icms?: number | null
          vl_ipi?: number | null
          vl_ismsst?: number | null
          vl_iss?: number | null
          vl_meta?: number | null
          vl_peso_bruto?: number | null
          vl_peso_liquido?: number | null
          vl_pis?: number | null
          vl_total?: number | null
        }
        Update: {
          ano_emissao?: string | null
          anomes_emissao?: string | null
          atualizado_em?: string
          carga_id?: string | null
          cd_agrupamento?: string | null
          cd_centro_custos?: string | null
          cd_centro_custos_1?: string | null
          cd_centro_custos_2?: string | null
          cd_centro_custos_3?: string | null
          cd_cidade?: string | null
          cd_cif_fob?: string | null
          cd_cliente?: string | null
          cd_derivacao?: string | null
          cd_empresa?: string | null
          cd_estado?: string | null
          cd_familia?: string | null
          cd_filial?: string | null
          cd_fpj?: string | null
          cd_grupo_cliente?: string | null
          cd_natureza?: string | null
          cd_nf?: string | null
          cd_origem?: string | null
          cd_pedido?: string | null
          cd_prj?: string | null
          cd_produto?: string | null
          cd_representante?: string | null
          cd_rev_pedido?: string | null
          cd_serie?: string | null
          cd_tns?: string | null
          cd_tp_movimento?: string | null
          cd_transportadora?: string | null
          cd_unidade_medida?: string | null
          dia_emissao?: string | null
          ds_abr_fpj?: string | null
          ds_abr_prj?: string | null
          dt_emissao?: string | null
          fonte_acao?: string | null
          id?: string
          id_nf?: string | null
          mes_emissao?: string | null
          qtd_produtos?: number | null
          vl_amostra?: number | null
          vl_bonificacao?: number | null
          vl_bruto?: number | null
          vl_cofins?: number | null
          vl_comissao?: number | null
          vl_custo?: number | null
          vl_desconto?: number | null
          vl_devolucao?: number | null
          vl_difal?: number | null
          vl_frete?: number | null
          vl_icms?: number | null
          vl_ipi?: number | null
          vl_ismsst?: number | null
          vl_iss?: number | null
          vl_meta?: number | null
          vl_peso_bruto?: number | null
          vl_peso_liquido?: number | null
          vl_pis?: number | null
          vl_total?: number | null
        }
        Relationships: []
      }
      bi_fornecedores: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          codigo: string
          nome: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          nome?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          nome?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_meta_faturamento: {
        Row: {
          ano: number | null
          anomes_emissao: string
          ativo: boolean
          codigo_unidade: string | null
          created_at: string
          created_by: string | null
          descricao_unidade: string | null
          id: string
          mes: number | null
          observacao: string | null
          origem_atualizada_em: string | null
          origem_meta: string
          unidade_negocio: string
          updated_at: string
          updated_by: string | null
          vl_meta: number
        }
        Insert: {
          ano?: number | null
          anomes_emissao: string
          ativo?: boolean
          codigo_unidade?: string | null
          created_at?: string
          created_by?: string | null
          descricao_unidade?: string | null
          id?: string
          mes?: number | null
          observacao?: string | null
          origem_atualizada_em?: string | null
          origem_meta?: string
          unidade_negocio: string
          updated_at?: string
          updated_by?: string | null
          vl_meta?: number
        }
        Update: {
          ano?: number | null
          anomes_emissao?: string
          ativo?: boolean
          codigo_unidade?: string | null
          created_at?: string
          created_by?: string | null
          descricao_unidade?: string | null
          id?: string
          mes?: number | null
          observacao?: string | null
          origem_atualizada_em?: string | null
          origem_meta?: string
          unidade_negocio?: string
          updated_at?: string
          updated_by?: string | null
          vl_meta?: number
        }
        Relationships: []
      }
      bi_ops_fila: {
        Row: {
          codcre: string
          codemp: number
          codopr: string | null
          codori: string | null
          codpro: string | null
          data_geracao_op: string | null
          descre: string | null
          descricao_operacao: string | null
          descricao_produto: string | null
          etl_updated_at: string
          id: string
          numorp: string
          prioridade: number
          quantidade_prevista: number
          situacao: string
          tempo_previsto_min: number
          tipo_recurso: string | null
          unidade_negocio: string | null
        }
        Insert: {
          codcre: string
          codemp: number
          codopr?: string | null
          codori?: string | null
          codpro?: string | null
          data_geracao_op?: string | null
          descre?: string | null
          descricao_operacao?: string | null
          descricao_produto?: string | null
          etl_updated_at?: string
          id?: string
          numorp: string
          prioridade?: number
          quantidade_prevista?: number
          situacao?: string
          tempo_previsto_min?: number
          tipo_recurso?: string | null
          unidade_negocio?: string | null
        }
        Update: {
          codcre?: string
          codemp?: number
          codopr?: string | null
          codori?: string | null
          codpro?: string | null
          data_geracao_op?: string | null
          descre?: string | null
          descricao_operacao?: string | null
          descricao_produto?: string | null
          etl_updated_at?: string
          id?: string
          numorp?: string
          prioridade?: number
          quantidade_prevista?: number
          situacao?: string
          tempo_previsto_min?: number
          tipo_recurso?: string | null
          unidade_negocio?: string | null
        }
        Relationships: []
      }
      bi_projetos: {
        Row: {
          cliente: string | null
          nome_projeto: string | null
          numero_projeto: string
          projeto_macro: string | null
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          nome_projeto?: string | null
          numero_projeto: string
          projeto_macro?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          nome_projeto?: string | null
          numero_projeto?: string
          projeto_macro?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_recebimentos: {
        Row: {
          cancelada: boolean
          centro_custo: string | null
          codigo_fornecedor: string | null
          codigo_item: string | null
          data_emissao_nf: string | null
          data_recebimento: string | null
          descricao_item: string | null
          erp_updated_at: string | null
          estornada: boolean
          etl_updated_at: string
          id: string
          mes_competencia: string | null
          nome_fornecedor: string | null
          nome_projeto: string | null
          numero_nf: string
          numero_oc_origem: string | null
          numero_projeto: string | null
          projeto_macro: string | null
          quantidade: number | null
          sequencia_item: number
          sequencia_oc_origem: number | null
          serie: string | null
          tipo_despesa: string | null
          tipo_despesa_calc: string | null
          tipo_movimento: string
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          cancelada?: boolean
          centro_custo?: string | null
          codigo_fornecedor?: string | null
          codigo_item?: string | null
          data_emissao_nf?: string | null
          data_recebimento?: string | null
          descricao_item?: string | null
          erp_updated_at?: string | null
          estornada?: boolean
          etl_updated_at?: string
          id?: string
          mes_competencia?: string | null
          nome_fornecedor?: string | null
          nome_projeto?: string | null
          numero_nf: string
          numero_oc_origem?: string | null
          numero_projeto?: string | null
          projeto_macro?: string | null
          quantidade?: number | null
          sequencia_item: number
          sequencia_oc_origem?: number | null
          serie?: string | null
          tipo_despesa?: string | null
          tipo_despesa_calc?: string | null
          tipo_movimento?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          cancelada?: boolean
          centro_custo?: string | null
          codigo_fornecedor?: string | null
          codigo_item?: string | null
          data_emissao_nf?: string | null
          data_recebimento?: string | null
          descricao_item?: string | null
          erp_updated_at?: string | null
          estornada?: boolean
          etl_updated_at?: string
          id?: string
          mes_competencia?: string | null
          nome_fornecedor?: string | null
          nome_projeto?: string | null
          numero_nf?: string
          numero_oc_origem?: string | null
          numero_projeto?: string | null
          projeto_macro?: string | null
          quantidade?: number | null
          sequencia_item?: number
          sequencia_oc_origem?: number | null
          serie?: string | null
          tipo_despesa?: string | null
          tipo_despesa_calc?: string | null
          tipo_movimento?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: []
      }
      bi_tipo_despesa: {
        Row: {
          codigo: string
          label: string
          regra_origem: string
          updated_at: string
        }
        Insert: {
          codigo: string
          label: string
          regra_origem?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          label?: string
          regra_origem?: string
          updated_at?: string
        }
        Relationships: []
      }
      bi_user_custom_metrics: {
        Row: {
          created_at: string
          format: string
          formula: string
          id: string
          label: string
          metric_id: string
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          format?: string
          formula: string
          id?: string
          label: string
          metric_id: string
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          format?: string
          formula?: string
          id?: string
          label?: string
          metric_id?: string
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bi_user_drill_presets: {
        Row: {
          columns: Json
          created_at: string
          escopo: string
          id: string
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          escopo: string
          id?: string
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          escopo?: string
          id?: string
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bi_user_widgets: {
        Row: {
          component_id: string
          created_at: string
          id: string
          mapping: Json
          options: Json
          ordem: number
          page_key: string
          section: string
          span: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          mapping?: Json
          options?: Json
          ordem?: number
          page_key: string
          section: string
          span?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          mapping?: Json
          options?: Json
          ordem?: number
          page_key?: string
          section?: string
          span?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      colaboradores_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_blocks: {
        Row: {
          cols: number
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          layout: Json
          ordem: number
          title: string
          updated_at: string
        }
        Insert: {
          cols?: number
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          layout?: Json
          ordem?: number
          title?: string
          updated_at?: string
        }
        Update: {
          cols?: number
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          layout?: Json
          ordem?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_blocks_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_cache: {
        Row: {
          cache_key: string
          created_at: string
          filtros_hash: string | null
          payload: Json
          valid_until: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          filtros_hash?: string | null
          payload: Json
          valid_until: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          filtros_hash?: string | null
          payload?: Json
          valid_until?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          block_id: string
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          layout: Json
          position: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          block_id: string
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          layout?: Json
          position?: number
          title?: string
          type: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          layout?: Json
          position?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "dashboard_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          module: string
          name: string
          owner_id: string | null
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          module: string
          name: string
          owner_id?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          module?: string
          name?: string
          owner_id?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          message: string
          module: string
          status_code: number | null
          user_email: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          module: string
          status_code?: number | null
          user_email?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          module?: string
          status_code?: number | null
          user_email?: string | null
        }
        Relationships: []
      }
      etl_acao_execucoes: {
        Row: {
          acao_id: string | null
          criado_em: string
          erro: string | null
          execucao_id: string
          finalizado_em: string | null
          id: string
          id_acao: string
          iniciado_em: string | null
          mensagem: string | null
          ordem: number
          status: string
          total_linhas: number
        }
        Insert: {
          acao_id?: string | null
          criado_em?: string
          erro?: string | null
          execucao_id: string
          finalizado_em?: string | null
          id?: string
          id_acao: string
          iniciado_em?: string | null
          mensagem?: string | null
          ordem: number
          status?: string
          total_linhas?: number
        }
        Update: {
          acao_id?: string | null
          criado_em?: string
          erro?: string | null
          execucao_id?: string
          finalizado_em?: string | null
          id?: string
          id_acao?: string
          iniciado_em?: string | null
          mensagem?: string | null
          ordem?: number
          status?: string
          total_linhas?: number
        }
        Relationships: [
          {
            foreignKeyName: "etl_acao_execucoes_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "etl_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etl_acao_execucoes_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "etl_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_acao_sql_versoes: {
        Row: {
          acao_id: string
          comentario: string | null
          criado_em: string
          criado_por: string | null
          id: string
          sql_template: string | null
          versao: number
        }
        Insert: {
          acao_id: string
          comentario?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          sql_template?: string | null
          versao: number
        }
        Update: {
          acao_id?: string
          comentario?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          sql_template?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "etl_acao_sql_versoes_acao_id_fkey"
            columns: ["acao_id"]
            isOneToOne: false
            referencedRelation: "etl_acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_acoes: {
        Row: {
          ativa: boolean
          atualizado_em: string
          caso_erro: string
          criado_em: string
          endpoint_api: string | null
          estrategia_carga: string
          id: string
          id_acao: string
          nome_acao: string | null
          ordem: number
          parametros_padrao: Json
          sql_atualizado_em: string | null
          sql_atualizado_por: string | null
          sql_template: string | null
          sql_versao: number
          tabela_destino: string | null
          tarefa_id: string
          timeout_segundos: number
          tipo_comando: string
          tipo_execucao: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          caso_erro?: string
          criado_em?: string
          endpoint_api?: string | null
          estrategia_carga?: string
          id?: string
          id_acao: string
          nome_acao?: string | null
          ordem: number
          parametros_padrao?: Json
          sql_atualizado_em?: string | null
          sql_atualizado_por?: string | null
          sql_template?: string | null
          sql_versao?: number
          tabela_destino?: string | null
          tarefa_id: string
          timeout_segundos?: number
          tipo_comando?: string
          tipo_execucao?: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          caso_erro?: string
          criado_em?: string
          endpoint_api?: string | null
          estrategia_carga?: string
          id?: string
          id_acao?: string
          nome_acao?: string | null
          ordem?: number
          parametros_padrao?: Json
          sql_atualizado_em?: string | null
          sql_atualizado_por?: string | null
          sql_template?: string | null
          sql_versao?: number
          tabela_destino?: string | null
          tarefa_id?: string
          timeout_segundos?: number
          tipo_comando?: string
          tipo_execucao?: string
        }
        Relationships: [
          {
            foreignKeyName: "etl_acoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "etl_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_conexoes: {
        Row: {
          codigo: string
          created_at: string
          database: string | null
          enabled: boolean
          host: string | null
          id: string
          observacoes: string | null
          porta: number | null
          secret_key: string | null
          tipo: string
          updated_at: string
          usuario: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          database?: string | null
          enabled?: boolean
          host?: string | null
          id?: string
          observacoes?: string | null
          porta?: number | null
          secret_key?: string | null
          tipo: string
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          database?: string | null
          enabled?: boolean
          host?: string | null
          id?: string
          observacoes?: string | null
          porta?: number | null
          secret_key?: string | null
          tipo?: string
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
      etl_configuracoes_bi: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          descricao: string | null
          valor: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          descricao?: string | null
          valor: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          descricao?: string | null
          valor?: string
        }
        Relationships: []
      }
      etl_execucoes: {
        Row: {
          acionado_por: string | null
          criado_em: string
          erro: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          mensagem: string | null
          nome_tarefa: string
          parametros: Json
          status: string
          tarefa_id: string | null
          total_linhas: number
        }
        Insert: {
          acionado_por?: string | null
          criado_em?: string
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          mensagem?: string | null
          nome_tarefa: string
          parametros?: Json
          status?: string
          tarefa_id?: string | null
          total_linhas?: number
        }
        Update: {
          acionado_por?: string | null
          criado_em?: string
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          mensagem?: string | null
          nome_tarefa?: string
          parametros?: Json
          status?: string
          tarefa_id?: string | null
          total_linhas?: number
        }
        Relationships: [
          {
            foreignKeyName: "etl_execucoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "etl_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_fila_integrador: {
        Row: {
          criado_em: string
          id: string
          mensagem: string | null
          nome_tarefa: string
          parametros: Json
          processado_em: string | null
          status: string
          tentativas: number
        }
        Insert: {
          criado_em?: string
          id?: string
          mensagem?: string | null
          nome_tarefa: string
          parametros?: Json
          processado_em?: string | null
          status?: string
          tentativas?: number
        }
        Update: {
          criado_em?: string
          id?: string
          mensagem?: string | null
          nome_tarefa?: string
          parametros?: Json
          processado_em?: string | null
          status?: string
          tentativas?: number
        }
        Relationships: []
      }
      etl_logs: {
        Row: {
          acao_execucao_id: string | null
          criado_em: string
          detalhe: Json
          execucao_id: string | null
          id: string
          mensagem: string
          nivel: string
          origem: string | null
        }
        Insert: {
          acao_execucao_id?: string | null
          criado_em?: string
          detalhe?: Json
          execucao_id?: string | null
          id?: string
          mensagem: string
          nivel?: string
          origem?: string | null
        }
        Update: {
          acao_execucao_id?: string | null
          criado_em?: string
          detalhe?: Json
          execucao_id?: string | null
          id?: string
          mensagem?: string
          nivel?: string
          origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etl_logs_acao_execucao_id_fkey"
            columns: ["acao_execucao_id"]
            isOneToOne: false
            referencedRelation: "etl_acao_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etl_logs_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "etl_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      etl_tarefas: {
        Row: {
          ativa: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          grupo: string
          id: string
          nome_tarefa: string
          ordem: number
          status_atual: string
          ultima_execucao_em: string | null
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          grupo?: string
          id?: string
          nome_tarefa: string
          ordem?: number
          status_atual?: string
          ultima_execucao_em?: string | null
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          grupo?: string
          id?: string
          nome_tarefa?: string
          ordem?: number
          status_atual?: string
          ultima_execucao_em?: string | null
        }
        Relationships: []
      }
      etl_watermark: {
        Row: {
          tarefa_codigo: string
          tipo: string
          ultimo_valor: string | null
          updated_at: string
        }
        Insert: {
          tarefa_codigo: string
          tipo?: string
          ultimo_valor?: string | null
          updated_at?: string
        }
        Update: {
          tarefa_codigo?: string
          tipo?: string
          ultimo_valor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      manutencao_frota: {
        Row: {
          centro_custo: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          fornecedor: string | null
          id: string
          mes: string | null
          motorista: string | null
          observacoes: string | null
          placa: string
          quilometragem: number | null
          segmento: string | null
          tipo_veiculo: string | null
          updated_at: string
          valor: number
          veiculo_descricao: string | null
        }
        Insert: {
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          mes?: string | null
          motorista?: string | null
          observacoes?: string | null
          placa: string
          quilometragem?: number | null
          segmento?: string | null
          tipo_veiculo?: string | null
          updated_at?: string
          valor?: number
          veiculo_descricao?: string | null
        }
        Update: {
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          mes?: string | null
          motorista?: string | null
          observacoes?: string | null
          placa?: string
          quilometragem?: number | null
          segmento?: string | null
          tipo_veiculo?: string | null
          updated_at?: string
          valor?: number
          veiculo_descricao?: string | null
        }
        Relationships: []
      }
      manutencao_frota_share_links: {
        Row: {
          access_count: number
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          hidden_visuals: string[]
          id: string
          last_accessed_at: string | null
          nome: string
          password_hash: string | null
          token: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome: string
          password_hash?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome?: string
          password_hash?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      manutencao_maquinas: {
        Row: {
          centro_custo: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          fornecedor: string | null
          id: string
          maquina: string
          mes: string | null
          nota_fiscal: string | null
          observacoes: string | null
          ordem_compra: string | null
          quantidade: number | null
          tipo_maquina: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          maquina: string
          mes?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          ordem_compra?: string | null
          quantidade?: number | null
          tipo_maquina?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          maquina?: string
          mes?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          ordem_compra?: string | null
          quantidade?: number | null
          tipo_maquina?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      manutencao_maquinas_share_links: {
        Row: {
          access_count: number
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          hidden_visuals: string[]
          id: string
          last_accessed_at: string | null
          nome: string
          password_hash: string | null
          token: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome: string
          password_hash?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome?: string
          password_hash?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      passagens_aereas: {
        Row: {
          centro_custo: string | null
          cia_aerea: string | null
          colaborador: string
          created_at: string
          created_by: string | null
          data_ida: string | null
          data_registro: string
          data_volta: string | null
          destino: string | null
          fornecedor: string | null
          id: string
          localizador: string | null
          motivo_viagem: string | null
          numero_bilhete: string | null
          observacoes: string | null
          origem: string | null
          projeto_obra: string | null
          tipo_despesa: string
          uf_destino: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo?: string | null
          cia_aerea?: string | null
          colaborador: string
          created_at?: string
          created_by?: string | null
          data_ida?: string | null
          data_registro?: string
          data_volta?: string | null
          destino?: string | null
          fornecedor?: string | null
          id?: string
          localizador?: string | null
          motivo_viagem?: string | null
          numero_bilhete?: string | null
          observacoes?: string | null
          origem?: string | null
          projeto_obra?: string | null
          tipo_despesa: string
          uf_destino?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          centro_custo?: string | null
          cia_aerea?: string | null
          colaborador?: string
          created_at?: string
          created_by?: string | null
          data_ida?: string | null
          data_registro?: string
          data_volta?: string | null
          destino?: string | null
          fornecedor?: string | null
          id?: string
          localizador?: string | null
          motivo_viagem?: string | null
          numero_bilhete?: string | null
          observacoes?: string | null
          origem?: string | null
          projeto_obra?: string | null
          tipo_despesa?: string
          uf_destino?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      passagens_aereas_share_links: {
        Row: {
          access_count: number
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          hidden_visuals: string[]
          id: string
          last_accessed_at: string | null
          nome: string
          password_hash: string | null
          token: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome: string
          password_hash?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hidden_visuals?: string[]
          id?: string
          last_accessed_at?: string | null
          nome?: string
          password_hash?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      producao_entrega_programada: {
        Row: {
          ativo: boolean
          cliente: string | null
          codemp: number
          codori: string | null
          codpro: string | null
          created_at: string
          created_by: string | null
          data_entrega: string
          descricao: string | null
          id: string
          numorp: string | null
          numprj: string | null
          obra: string | null
          observacao: string | null
          prioridade: number
          tipo_entrega: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente?: string | null
          codemp: number
          codori?: string | null
          codpro?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega: string
          descricao?: string | null
          id?: string
          numorp?: string | null
          numprj?: string | null
          obra?: string | null
          observacao?: string | null
          prioridade?: number
          tipo_entrega?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente?: string | null
          codemp?: number
          codori?: string | null
          codpro?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string
          descricao?: string | null
          id?: string
          numorp?: string | null
          numprj?: string | null
          obra?: string | null
          observacao?: string | null
          prioridade?: number
          tipo_entrega?: string
          updated_at?: string
        }
        Relationships: []
      }
      producao_leadtime_etapa: {
        Row: {
          ativo: boolean
          codcre: string | null
          codemp: number
          codopr: string | null
          considerar_no_calculo: boolean
          created_at: string
          folga_seguranca_dias: number
          id: string
          leadtime_fixo_dias: number
          obs: string | null
          tipo_recurso: string | null
          unidade_negocio: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codcre?: string | null
          codemp: number
          codopr?: string | null
          considerar_no_calculo?: boolean
          created_at?: string
          folga_seguranca_dias?: number
          id?: string
          leadtime_fixo_dias?: number
          obs?: string | null
          tipo_recurso?: string | null
          unidade_negocio?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codcre?: string | null
          codemp?: number
          codopr?: string | null
          considerar_no_calculo?: boolean
          created_at?: string
          folga_seguranca_dias?: number
          id?: string
          leadtime_fixo_dias?: number
          obs?: string | null
          tipo_recurso?: string | null
          unidade_negocio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      producao_prioridade_op: {
        Row: {
          atualizado_por: string | null
          codemp: number
          created_at: string
          id: string
          numorp: string
          observacao: string | null
          prioridade: number
          updated_at: string
        }
        Insert: {
          atualizado_por?: string | null
          codemp: number
          created_at?: string
          id?: string
          numorp: string
          observacao?: string | null
          prioridade?: number
          updated_at?: string
        }
        Update: {
          atualizado_por?: string | null
          codemp?: number
          created_at?: string
          id?: string
          numorp?: string
          observacao?: string | null
          prioridade?: number
          updated_at?: string
        }
        Relationships: []
      }
      producao_recurso_unidade: {
        Row: {
          ativo: boolean
          codccu_sugerido: string | null
          codcre: string
          codemp: number
          considera_carga: boolean
          created_at: string
          descre: string | null
          id: number
          obs: string | null
          tipo_recurso: string | null
          unidade_negocio: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codccu_sugerido?: string | null
          codcre: string
          codemp: number
          considera_carga?: boolean
          created_at?: string
          descre?: string | null
          id?: number
          obs?: string | null
          tipo_recurso?: string | null
          unidade_negocio: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codccu_sugerido?: string | null
          codcre?: string
          codemp?: number
          considera_carga?: boolean
          created_at?: string
          descre?: string | null
          id?: number
          obs?: string | null
          tipo_recurso?: string | null
          unidade_negocio?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_screens: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          profile_id: string
          screen_name: string
          screen_path: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          profile_id: string
          screen_name: string
          screen_path: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          profile_id?: string
          screen_name?: string
          screen_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_screens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visuals: {
        Row: {
          can_view: boolean
          created_at: string
          id: string
          profile_id: string
          updated_at: string
          visual_key: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
          visual_key: string
        }
        Update: {
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
          visual_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_visuals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string | null
          display_name: string | null
          email: string | null
          erp_user: string | null
          id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          erp_user?: string | null
          id: string
        }
        Update: {
          approved?: boolean
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          erp_user?: string | null
          id?: string
        }
        Relationships: []
      }
      programacao_agenda: {
        Row: {
          codcre: string
          codemp: number
          codopr: string | null
          codori: string | null
          codpro: string | null
          created_at: string
          data_programada: string
          descre: string | null
          descricao_operacao: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          lote_programacao: string
          numorp: string
          segmento: number
          status_programacao: string
          tempo_alocado_min: number
          tipo_recurso: string | null
          unidade_negocio: string | null
        }
        Insert: {
          codcre: string
          codemp: number
          codopr?: string | null
          codori?: string | null
          codpro?: string | null
          created_at?: string
          data_programada: string
          descre?: string | null
          descricao_operacao?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          lote_programacao: string
          numorp: string
          segmento?: number
          status_programacao?: string
          tempo_alocado_min?: number
          tipo_recurso?: string | null
          unidade_negocio?: string | null
        }
        Update: {
          codcre?: string
          codemp?: number
          codopr?: string | null
          codori?: string | null
          codpro?: string | null
          created_at?: string
          data_programada?: string
          descre?: string | null
          descricao_operacao?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          lote_programacao?: string
          numorp?: string
          segmento?: number
          status_programacao?: string
          tempo_alocado_min?: number
          tipo_recurso?: string | null
          unidade_negocio?: string | null
        }
        Relationships: []
      }
      programacao_capacidades: {
        Row: {
          ativo: boolean
          codcre: string
          codemp: number
          considerar_domingo: boolean
          considerar_sabado: boolean
          created_at: string
          descre: string | null
          eficiencia_perc: number
          hora_inicio: string
          id: string
          minutos_dia: number
          obs: string | null
          qtde_recursos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codcre: string
          codemp: number
          considerar_domingo?: boolean
          considerar_sabado?: boolean
          created_at?: string
          descre?: string | null
          eficiencia_perc?: number
          hora_inicio?: string
          id?: string
          minutos_dia?: number
          obs?: string | null
          qtde_recursos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codcre?: string
          codemp?: number
          considerar_domingo?: boolean
          considerar_sabado?: boolean
          created_at?: string
          descre?: string | null
          eficiencia_perc?: number
          hora_inicio?: string
          id?: string
          minutos_dia?: number
          obs?: string | null
          qtde_recursos?: number
          updated_at?: string
        }
        Relationships: []
      }
      relatorio_colunas: {
        Row: {
          agrupar: boolean
          alinhamento: string
          campo: string
          created_at: string
          formato: string | null
          id: string
          largura: number | null
          ordem: number
          permite_filtrar: boolean
          permite_ordenar: boolean
          regra_condicional_json: Json
          relatorio_id: string
          tipo: string | null
          titulo: string | null
          totalizar: boolean
          visivel: boolean
          visivel_excel: boolean
          visivel_pdf: boolean
        }
        Insert: {
          agrupar?: boolean
          alinhamento?: string
          campo: string
          created_at?: string
          formato?: string | null
          id?: string
          largura?: number | null
          ordem?: number
          permite_filtrar?: boolean
          permite_ordenar?: boolean
          regra_condicional_json?: Json
          relatorio_id: string
          tipo?: string | null
          titulo?: string | null
          totalizar?: boolean
          visivel?: boolean
          visivel_excel?: boolean
          visivel_pdf?: boolean
        }
        Update: {
          agrupar?: boolean
          alinhamento?: string
          campo?: string
          created_at?: string
          formato?: string | null
          id?: string
          largura?: number | null
          ordem?: number
          permite_filtrar?: boolean
          permite_ordenar?: boolean
          regra_condicional_json?: Json
          relatorio_id?: string
          tipo?: string | null
          titulo?: string | null
          totalizar?: boolean
          visivel?: boolean
          visivel_excel?: boolean
          visivel_pdf?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_colunas_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_execucoes: {
        Row: {
          erro: string | null
          executado_em: string
          executado_por: string | null
          formato: string
          id: string
          parametros: Json
          qtd_linhas: number | null
          relatorio_id: string
          status: string
          tempo_ms: number | null
        }
        Insert: {
          erro?: string | null
          executado_em?: string
          executado_por?: string | null
          formato?: string
          id?: string
          parametros?: Json
          qtd_linhas?: number | null
          relatorio_id: string
          status?: string
          tempo_ms?: number | null
        }
        Update: {
          erro?: string | null
          executado_em?: string
          executado_por?: string | null
          formato?: string
          id?: string
          parametros?: Json
          qtd_linhas?: number | null
          relatorio_id?: string
          status?: string
          tempo_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_execucoes_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_layout: {
        Row: {
          agrupar_por: string | null
          config: Json
          congelar_colunas: number
          destaques_json: Json
          mostrar_data_hora: boolean
          mostrar_filtros: boolean
          mostrar_totais: boolean
          mostrar_usuario: boolean
          ordenacao_padrao: Json
          paginacao: boolean
          por_pagina: number
          relatorio_id: string
          subtitulo: string | null
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          agrupar_por?: string | null
          config?: Json
          congelar_colunas?: number
          destaques_json?: Json
          mostrar_data_hora?: boolean
          mostrar_filtros?: boolean
          mostrar_totais?: boolean
          mostrar_usuario?: boolean
          ordenacao_padrao?: Json
          paginacao?: boolean
          por_pagina?: number
          relatorio_id: string
          subtitulo?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          agrupar_por?: string | null
          config?: Json
          congelar_colunas?: number
          destaques_json?: Json
          mostrar_data_hora?: boolean
          mostrar_filtros?: boolean
          mostrar_totais?: boolean
          mostrar_usuario?: boolean
          ordenacao_padrao?: Json
          paginacao?: boolean
          por_pagina?: number
          relatorio_id?: string
          subtitulo?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_layout_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: true
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_parametros: {
        Row: {
          created_at: string
          id: string
          label: string | null
          nome: string
          obrigatorio: boolean
          ordem: number
          relatorio_id: string
          sql_lista: string | null
          tipo: string
          valor_padrao: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          nome: string
          obrigatorio?: boolean
          ordem?: number
          relatorio_id: string
          sql_lista?: string | null
          tipo?: string
          valor_padrao?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          relatorio_id?: string
          sql_lista?: string | null
          tipo?: string
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_parametros_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_permissoes: {
        Row: {
          can_export: boolean
          can_print: boolean
          can_view: boolean
          created_at: string
          id: string
          profile_id: string
          relatorio_id: string
        }
        Insert: {
          can_export?: boolean
          can_print?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id: string
          relatorio_id: string
        }
        Update: {
          can_export?: boolean
          can_print?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          relatorio_id?: string
        }
        Relationships: []
      }
      relatorio_publicacoes: {
        Row: {
          ativo: boolean
          id: string
          menu_path: string | null
          modulo: string | null
          publicado_em: string
          publicado_por: string | null
          relatorio_id: string
          versao_id: string | null
        }
        Insert: {
          ativo?: boolean
          id?: string
          menu_path?: string | null
          modulo?: string | null
          publicado_em?: string
          publicado_por?: string | null
          relatorio_id: string
          versao_id?: string | null
        }
        Update: {
          ativo?: boolean
          id?: string
          menu_path?: string | null
          modulo?: string | null
          publicado_em?: string
          publicado_por?: string | null
          relatorio_id?: string
          versao_id?: string | null
        }
        Relationships: []
      }
      relatorio_versoes: {
        Row: {
          colunas_json: Json
          config_json: Json
          criado_em: string
          criado_por: string | null
          id: string
          layout_json: Json
          observacao: string | null
          parametros_json: Json
          relatorio_id: string
          sql_base: string
          versao: number
        }
        Insert: {
          colunas_json?: Json
          config_json?: Json
          criado_em?: string
          criado_por?: string | null
          id?: string
          layout_json?: Json
          observacao?: string | null
          parametros_json?: Json
          relatorio_id: string
          sql_base?: string
          versao: number
        }
        Update: {
          colunas_json?: Json
          config_json?: Json
          criado_em?: string
          criado_por?: string | null
          id?: string
          layout_json?: Json
          observacao?: string | null
          parametros_json?: Json
          relatorio_id?: string
          sql_base?: string
          versao?: number
        }
        Relationships: []
      }
      relatorios: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          endpoint_url: string | null
          fonte_dados: string | null
          icone: string | null
          id: string
          modulo: string | null
          nome: string
          permite_csv: boolean
          permite_excel: boolean
          permite_impressao: boolean
          permite_pdf: boolean
          sql_query: string
          status: string
          tipo_fonte: string
          updated_at: string
          url_destino: string | null
          versao_atual: number
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          endpoint_url?: string | null
          fonte_dados?: string | null
          icone?: string | null
          id?: string
          modulo?: string | null
          nome: string
          permite_csv?: boolean
          permite_excel?: boolean
          permite_impressao?: boolean
          permite_pdf?: boolean
          sql_query?: string
          status?: string
          tipo_fonte?: string
          updated_at?: string
          url_destino?: string | null
          versao_atual?: number
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          endpoint_url?: string | null
          fonte_dados?: string | null
          icone?: string | null
          id?: string
          modulo?: string | null
          nome?: string
          permite_csv?: boolean
          permite_excel?: boolean
          permite_impressao?: boolean
          permite_pdf?: boolean
          sql_query?: string
          status?: string
          tipo_fonte?: string
          updated_at?: string
          url_destino?: string | null
          versao_atual?: number
        }
        Relationships: []
      }
      senior_disconnect_rules: {
        Row: {
          created_at: string
          descricao: string | null
          enabled: boolean
          id: string
          nome: string
          params: Json
          rule_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          enabled?: boolean
          id?: string
          nome: string
          params?: Json
          rule_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          enabled?: boolean
          id?: string
          nome?: string
          params?: Json
          rule_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      senior_disconnect_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          motivo: string | null
          usuario: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          usuario: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string | null
          usuario?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          user_login: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          user_login: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          user_login?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          path: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          path?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          path?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_assistant_prefs: Json
          bi_display_prefs: Json
          favorite_modules: Json
          frequent_filters: Json
          preferred_period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_assistant_prefs?: Json
          bi_display_prefs?: Json
          favorite_modules?: Json
          frequent_filters?: Json
          preferred_period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_assistant_prefs?: Json
          bi_display_prefs?: Json
          favorite_modules?: Json
          frequent_filters?: Json
          preferred_period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_search_history: {
        Row: {
          created_at: string
          filters: Json
          id: string
          module: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          module: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          module?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          current_path: string | null
          display_name: string | null
          force_logout_at: string | null
          last_seen_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          current_path?: string | null
          display_name?: string | null
          force_logout_at?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          current_path?: string | null
          display_name?: string | null
          force_logout_at?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usu_log_navegacao_erp: {
        Row: {
          acao: Database["public"]["Enums"]["navegacao_acao"]
          computador: string | null
          created_at: string
          detalhes: Json
          erp_user: string | null
          id: string
          ip: string | null
          observacao: string | null
          origem_evento: string
          path_url: string | null
          session_id: string | null
          sistema: string
          tela_codigo: string | null
          tela_nome: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao?: Database["public"]["Enums"]["navegacao_acao"]
          computador?: string | null
          created_at?: string
          detalhes?: Json
          erp_user?: string | null
          id?: string
          ip?: string | null
          observacao?: string | null
          origem_evento?: string
          path_url?: string | null
          session_id?: string | null
          sistema?: string
          tela_codigo?: string | null
          tela_nome?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["navegacao_acao"]
          computador?: string | null
          created_at?: string
          detalhes?: Json
          erp_user?: string | null
          id?: string
          ip?: string | null
          observacao?: string | null
          origem_evento?: string
          path_url?: string | null
          session_id?: string | null
          sistema?: string
          tela_codigo?: string | null
          tela_nome?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_bi_faturamento_comercial: {
        Row: {
          ano_emissao: string | null
          anomes_emissao: string | null
          cd_cidade: string | null
          cd_cliente: string | null
          cd_estado: string | null
          cd_fpj: string | null
          cd_grupo_cliente: string | null
          cd_nf: string | null
          cd_prj: string | null
          cd_representante: string | null
          cd_tns: string | null
          ds_abr_fpj: string | null
          ds_abr_prj: string | null
          dt_emissao: string | null
          fonte_acao: string | null
          id: string | null
          id_nf: string | null
          impostos: number | null
          mes_emissao: string | null
          qtd_produtos: number | null
          unidade_negocio: string | null
          vl_bruto: number | null
          vl_devolucao: number | null
          vl_liquido: number | null
        }
        Insert: {
          ano_emissao?: string | null
          anomes_emissao?: string | null
          cd_cidade?: string | null
          cd_cliente?: string | null
          cd_estado?: string | null
          cd_fpj?: string | null
          cd_grupo_cliente?: string | null
          cd_nf?: string | null
          cd_prj?: string | null
          cd_representante?: string | null
          cd_tns?: string | null
          ds_abr_fpj?: string | null
          ds_abr_prj?: string | null
          dt_emissao?: string | null
          fonte_acao?: string | null
          id?: string | null
          id_nf?: string | null
          impostos?: never
          mes_emissao?: string | null
          qtd_produtos?: never
          unidade_negocio?: never
          vl_bruto?: never
          vl_devolucao?: never
          vl_liquido?: never
        }
        Update: {
          ano_emissao?: string | null
          anomes_emissao?: string | null
          cd_cidade?: string | null
          cd_cliente?: string | null
          cd_estado?: string | null
          cd_fpj?: string | null
          cd_grupo_cliente?: string | null
          cd_nf?: string | null
          cd_prj?: string | null
          cd_representante?: string | null
          cd_tns?: string | null
          ds_abr_fpj?: string | null
          ds_abr_prj?: string | null
          dt_emissao?: string | null
          fonte_acao?: string | null
          id?: string | null
          id_nf?: string | null
          impostos?: never
          mes_emissao?: string | null
          qtd_produtos?: never
          unidade_negocio?: never
          vl_bruto?: never
          vl_devolucao?: never
          vl_liquido?: never
        }
        Relationships: []
      }
      vw_ultima_tela_usuario: {
        Row: {
          acao: Database["public"]["Enums"]["navegacao_acao"] | null
          computador: string | null
          erp_user: string | null
          ip: string | null
          session_id: string | null
          sistema: string | null
          tela_codigo: string | null
          tela_nome: string | null
          ultima_navegacao: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_delete_frota: { Args: { _uid: string }; Returns: boolean }
      can_edit_bi_meta: { Args: { _uid: string }; Returns: boolean }
      can_edit_dashboard: {
        Args: { _dashboard_id: string; _uid: string }
        Returns: boolean
      }
      can_edit_frota: { Args: { _uid: string }; Returns: boolean }
      can_edit_maquinas: { Args: { _uid: string }; Returns: boolean }
      can_edit_passagens: { Args: { _uid: string }; Returns: boolean }
      can_manage_frota_share: { Args: { _uid: string }; Returns: boolean }
      can_manage_maquinas_share: { Args: { _uid: string }; Returns: boolean }
      can_manage_passagens_share: { Args: { _uid: string }; Returns: boolean }
      cleanup_old_error_logs: { Args: never; Returns: undefined }
      cleanup_old_navegacao_logs: { Args: never; Returns: undefined }
      cleanup_old_search_history: { Args: never; Returns: undefined }
      cleanup_old_user_activity: { Args: never; Returns: undefined }
      create_dashboard_block: {
        Args: { _dashboard_id: string; _title?: string }
        Returns: string
      }
      create_frota_share_link: {
        Args: {
          _expires_at?: string
          _hidden_visuals?: string[]
          _nome: string
          _password?: string
          _token: string
        }
        Returns: string
      }
      create_maquinas_share_link: {
        Args: {
          _expires_at?: string
          _hidden_visuals?: string[]
          _nome: string
          _password?: string
          _token: string
        }
        Returns: string
      }
      create_passagens_share_link:
        | {
            Args: {
              _expires_at?: string
              _nome: string
              _password?: string
              _token: string
            }
            Returns: string
          }
        | {
            Args: {
              _expires_at?: string
              _hidden_visuals?: string[]
              _nome: string
              _password?: string
              _token: string
            }
            Returns: string
          }
      delete_dashboard_block: {
        Args: { _block_id: string; _move_widgets_to?: string }
        Returns: undefined
      }
      ensure_default_block: { Args: { _dashboard_id: string }; Returns: string }
      force_user_logout: { Args: { _user_id: string }; Returns: undefined }
      get_frota_blocks_via_token: {
        Args: { _token: string }
        Returns: {
          block_id: string
          cols: number
          config: Json
          layout: Json
          ordem: number
          title: string
        }[]
      }
      get_frota_layout_via_token: {
        Args: { _token: string }
        Returns: {
          widget_block_id: string
          widget_config: Json
          widget_id: string
          widget_layout: Json
          widget_position: number
          widget_title: string
          widget_type: string
        }[]
      }
      get_frota_share_link_meta: {
        Args: { _token: string }
        Returns: {
          exists_link: boolean
          expired: boolean
          nome: string
          requires_password: boolean
        }[]
      }
      get_frota_share_link_visuals: {
        Args: { _token: string }
        Returns: string[]
      }
      get_frota_via_token: {
        Args: { _password?: string; _token: string }
        Returns: {
          centro_custo: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          fornecedor: string | null
          id: string
          mes: string | null
          motorista: string | null
          observacoes: string | null
          placa: string
          quilometragem: number | null
          segmento: string | null
          tipo_veiculo: string | null
          updated_at: string
          valor: number
          veiculo_descricao: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "manutencao_frota"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_maquinas_blocks_via_token: {
        Args: { _token: string }
        Returns: {
          block_id: string
          cols: number
          config: Json
          layout: Json
          ordem: number
          title: string
        }[]
      }
      get_maquinas_layout_via_token: {
        Args: { _token: string }
        Returns: {
          widget_block_id: string
          widget_config: Json
          widget_id: string
          widget_layout: Json
          widget_position: number
          widget_title: string
          widget_type: string
        }[]
      }
      get_maquinas_share_link_meta: {
        Args: { _token: string }
        Returns: {
          exists_link: boolean
          expired: boolean
          nome: string
          requires_password: boolean
        }[]
      }
      get_maquinas_share_link_visuals: {
        Args: { _token: string }
        Returns: string[]
      }
      get_maquinas_via_token: {
        Args: { _password?: string; _token: string }
        Returns: {
          centro_custo: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          fornecedor: string | null
          id: string
          maquina: string
          mes: string | null
          nota_fiscal: string | null
          observacoes: string | null
          ordem_compra: string | null
          quantidade: number | null
          tipo_maquina: string | null
          updated_at: string
          valor: number
        }[]
        SetofOptions: {
          from: "*"
          to: "manutencao_maquinas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_passagens_blocks_via_token: {
        Args: { _token: string }
        Returns: {
          block_id: string
          cols: number
          config: Json
          layout: Json
          ordem: number
          title: string
        }[]
      }
      get_passagens_layout_via_token: {
        Args: { _token: string }
        Returns: {
          widget_block_id: string
          widget_config: Json
          widget_id: string
          widget_layout: Json
          widget_position: number
          widget_title: string
          widget_type: string
        }[]
      }
      get_passagens_via_token: {
        Args: { _password?: string; _token: string }
        Returns: {
          centro_custo: string | null
          cia_aerea: string | null
          colaborador: string
          created_at: string
          created_by: string | null
          data_ida: string | null
          data_registro: string
          data_volta: string | null
          destino: string | null
          fornecedor: string | null
          id: string
          localizador: string | null
          motivo_viagem: string | null
          numero_bilhete: string | null
          observacoes: string | null
          origem: string | null
          projeto_obra: string | null
          tipo_despesa: string
          uf_destino: string | null
          updated_at: string
          valor: number
        }[]
        SetofOptions: {
          from: "*"
          to: "passagens_aereas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_programacao_gargalos: {
        Args: {
          p_codcre?: string
          p_codemp?: number
          p_data_fim?: string
          p_data_ini?: string
          p_unidade_negocio?: string
        }
        Returns: {
          capacidade_disponivel_horas: number
          carga_programada_horas: number
          codcre: string
          data: string
          descre: string
          dia_semana: string
          ocupacao_perc: number
          status: string
          unidade_negocio: string
        }[]
      }
      get_share_link_meta: {
        Args: { _token: string }
        Returns: {
          exists_link: boolean
          expired: boolean
          nome: string
          requires_password: boolean
        }[]
      }
      get_share_link_visuals: { Args: { _token: string }; Returns: string[] }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      move_widget_to_block: {
        Args: { _block_id: string; _widget_id: string }
        Returns: undefined
      }
      update_dashboard_block: {
        Args: {
          _block_id: string
          _cols?: number
          _config?: Json
          _ordem?: number
          _title?: string
        }
        Returns: undefined
      }
      upsert_bi_comercial_dashboard_default: { Args: never; Returns: string }
      upsert_frota_dashboard_default: { Args: never; Returns: string }
      upsert_maquinas_dashboard_default: { Args: never; Returns: string }
      upsert_passagens_dashboard_default: { Args: never; Returns: string }
      validate_frota_share_token: {
        Args: { _password?: string; _token: string }
        Returns: boolean
      }
      validate_maquinas_share_token: {
        Args: { _password?: string; _token: string }
        Returns: boolean
      }
      validate_share_token: {
        Args: { _password?: string; _token: string }
        Returns: boolean
      }
    }
    Enums: {
      navegacao_acao:
        | "entrar"
        | "sair"
        | "click"
        | "erro"
        | "ABRIU_TELA"
        | "HEARTBEAT"
        | "TROCOU_TELA"
        | "FECHOU_TELA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      navegacao_acao: [
        "entrar",
        "sair",
        "click",
        "erro",
        "ABRIU_TELA",
        "HEARTBEAT",
        "TROCOU_TELA",
        "FECHOU_TELA",
      ],
    },
  },
} as const

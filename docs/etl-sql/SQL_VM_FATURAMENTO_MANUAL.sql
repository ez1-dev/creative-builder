    SELECT 	
            'FATURAMENTO MAN'                          								AS CD_TP_MOVIMENTO,
            'LANCTO MANUAL'                       								AS CD_ORIGEM,
            CONVERT(VARCHAR,E640LCT.CODEMP)										AS CD_EMPRESA,
            CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL)	AS CD_FILIAL,
            CAST(E140NFV.CODEMP AS NVARCHAR) + '-' + CAST(E140NFV.CODFIL AS NVARCHAR) + '-' + 
            CAST(E140NFV.CODSNF AS NVARCHAR) + '-' + CAST(E140NFV.NUMNFV AS NVARCHAR) 		
                                                                                AS ID_NF,
            COALESCE(E644LNF.NUMNFI, 0)              							AS CD_NF,
            CONVERT(VARCHAR,E140NFV.CODSNF) 									AS CD_SERIE,
            CAST(CONVERT(DATE, E640LCT.DATLCT) AS DATE) 						AS DT_EMISSAO,
            CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR) 								AS ANO_EMISSAO,
            CAST(YEAR(E640LCT.DATLCT)*100+MONTH(E640LCT.DATLCT) AS NVARCHAR)    AS ANOMES_EMISSAO,
            RIGHT('0' + CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR), 2) 			AS MES_EMISSAO,
            RIGHT('0' + CAST(DAY(E640LCT.DATLCT) AS NVARCHAR), 2) 				AS DIA_EMISSAO,
            NULL                                 								AS CD_ESTADO,
            NULL			                                                    AS CD_CIDADE,
            CAST(E001TNS.COMNAT AS NVARCHAR)                      				AS CD_NATUREZA,
            CASE
                 WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                 THEN COALESCE(E140NFV.TNSPRO, ' ')
                 ELSE CASE
                          WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                          THEN COALESCE(E140NFV.TNSSER, ' ')
                          ELSE CASE
                                   WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                   THEN COALESCE(E440NFC.TNSPRO, ' ')
                                   ELSE COALESCE(E440NFC.TNSSER, '0')
                               END 
                      END
            END                                 								AS CD_TNS,
            'LANCTO MANUAL'                      							    AS CD_REPRESENTANTE,
            'LANCTO MANUAL'                      								AS CD_GRUPO_CLIENTE,
            'LANCTO MANUAL'                      								AS CD_REV_PEDIDO,
            'LANCTO MANUAL'                      								AS CD_CLIENTE,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_1,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_2,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_3,
            'LANCTO MANUAL'                      								AS CD_PRJ,
            'LANCTO MANUAL'                      								AS DS_ABR_PRJ,
            'LANCTO MANUAL'                      								AS CD_FPJ,
            'LANCTO MANUAL'                      								AS DS_ABR_FPJ,
            'LANCTO MANUAL'                      								AS CD_PEDIDO,
            'LANCTO MANUAL'                      								AS CD_CIF_FOB,
            'LANCTO MANUAL'                      								AS CD_TRANSPORTADORA,
            'LANCTO MANUAL'                      								AS CD_FAMILIA,
            '99999'                                 							AS CD_AGRUPAMENTO,
            'LANCTO MANUAL'                      							    AS CD_PRODUTO,
            '0'                                 							    AS CD_DERIVACAO,
            'LANCTO MANUAL'                      							    AS CD_UNIDADE_MEDIDA,
            0                                   								AS VL_PESO_BRUTO,
            0                                   								AS VL_PESO_LIQUIDO,
            0                      									            AS QTD_PRODUTOS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '01', '02', '03' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_BRUTO,
            0                                   								AS VL_TOTAL,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '18' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                               							    AS VL_COMISSAO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '17' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                               								AS VL_DESCONTO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '04' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                               							    AS VL_ICMS,
            0                                                                   AS VL_DIFAL,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '05' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                               								AS VL_IPI,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '07' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                							AS VL_COFINS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '06' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                							AS VL_PIS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '08' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                               								AS VL_ISS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '09' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                  							AS VL_AMOSTRA,
            SUM(CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '10' )THEN
                 E640LCT.VLRLCT *- 1
                 ELSE 0
               END )                                  									 AS VL_BONIFICACAO,
            SUM(CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '11' )THEN
                 E640LCT.VLRLCT *- 1
                 ELSE 0
               END)                                   									 AS VL_FRETE,
            SUM(CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '16' )THEN
                 E640LCT.VLRLCT *- 1
                 ELSE 0
               END )                									 	             AS VL_ICMSST,
               0                                   								     AS VL_CUSTO,
            SUM(CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '12' )THEN
                 E640LCT.VLRLCT *- 1
                 ELSE 0
               END)                                   									 AS VL_DEVOLUCAO,
               0                                                                     AS VL_META
      FROM  E640LCT
INNER JOIN  E045PLA
        ON  E640LCT.CODEMP = E045PLA.CODEMP
       AND  E640LCT.CTADEB = E045PLA.CTARED
 LEFT JOIN  (SELECT  DISTINCT 
                     NUMLCT,
                     NUMNFI,
                     CODEMP,
                     CODSNF,
                     CODFOR,
                     CODFIL
               FROM  E644LNF) E644LNF
        ON  E640LCT.CODEMP = E644LNF.CODEMP
       AND  E640LCT.NUMLCT = E644LNF.NUMLCT
 LEFT JOIN  (SELECT  DISTINCT 
                     TNSPRO,
                     TNSSER,
                     NUMNFC,
                     CODSNF,
                     CODEMP,
                     CODFOR,
                     CODFIL
               FROM  E440NFC) E440NFC
        ON  E440NFC.CODEMP = E644LNF.CODEMP
       AND  E440NFC.CODFIL = E644LNF.CODFIL
       AND  E440NFC.CODFOR = E644LNF.CODFOR
       AND  E440NFC.CODSNF = E644LNF.CODSNF
       AND  E440NFC.NUMNFC = E644LNF.NUMNFI
 LEFT JOIN  (SELECT  DISTINCT 
                              TNSPRO,
                              TNSSER,
                              NUMNFV,
                              CODSNF,
                              CODEMP,
                              CODFIL
                        FROM  E140NFV) E140NFV
        ON  E140NFV.CODEMP = E644LNF.CODEMP
       AND  E140NFV.CODFIL = E644LNF.CODFIL
       AND  E140NFV.CODSNF = E644LNF.CODSNF
       AND  E140NFV.NUMNFV = E644LNF.NUMNFI
 LEFT JOIN  E001TNS
        ON  CASE
                WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                THEN COALESCE(E140NFV.TNSPRO, ' ')
                ELSE CASE
                         WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                         THEN COALESCE(E140NFV.TNSSER, ' ')
                         ELSE CASE
                                  WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                  THEN COALESCE(E440NFC.TNSPRO, ' ')
                                  ELSE COALESCE(E440NFC.TNSSER, '0')
                              END
                     END
             END = E001TNS.CODTNS
       AND  E640LCT.CODEMP = E001TNS.CODEMP
     WHERE  E640LCT.SITLCT = 2
       AND  E640LCT.ORILCT = 'MAN'
       AND  CAST(CASE
                     WHEN COALESCE(E045PLA.USU_MCTCTA, ' ') = ' ' OR COALESCE(E045PLA.USU_MCTCTA, '  ') = '  '
                     THEN '0'
                     ELSE  E045PLA.USU_MCTCTA
                 END AS INT) BETWEEN 1 AND 20
       AND  CAST(YEAR(E640LCT.DATLCT)*100+MONTH(E640LCT.DATLCT) AS NVARCHAR) BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
  GROUP BY  CONVERT(VARCHAR,E640LCT.CODEMP),
            CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL),
            CAST(E140NFV.CODEMP AS NVARCHAR)+'-'+CAST(E140NFV.CODFIL AS NVARCHAR)+'-'+CAST(E140NFV.CODSNF AS NVARCHAR)+'-'+CAST(E140NFV.NUMNFV AS NVARCHAR),
            COALESCE(E644LNF.NUMNFI,0),
            CONVERT(VARCHAR,E140NFV.CODSNF),
            CAST(CONVERT(DATE, E640LCT.DATLCT)AS DATE),
            CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR),
            CAST(YEAR(E640LCT.DATLCT)*100+MONTH(E640LCT.DATLCT) AS NVARCHAR),
            RIGHT('0'+CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR),2),
            RIGHT('0'+CAST(DAY(E640LCT.DATLCT) AS NVARCHAR),2),
            E001TNS.COMNAT,
            CASE
                WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                THEN COALESCE(E140NFV.TNSPRO, ' ')
                ELSE CASE
                         WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                         THEN COALESCE(E140NFV.TNSSER, ' ')
                         ELSE CASE
                                  WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                  THEN COALESCE(E440NFC.TNSPRO, ' ')
                                  ELSE COALESCE(E440NFC.TNSSER, '0')
                              END 
                     END
            END 
 
 UNION ALL
 
    SELECT 	
            'FATURAMENTO MAN'                          								AS CD_TP_MOVIMENTO,
            'LANCTO MANUAL'                       								AS CD_ORIGEM,
            CONVERT(VARCHAR,E640LCT.CODEMP)										AS CD_EMPRESA,
            CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL)	AS CD_FILIAL,
            CAST(E140NFV.CODEMP AS NVARCHAR)+'-'+CAST(E140NFV.CODFIL AS NVARCHAR)+'-'+ 
            CAST(E140NFV.CODSNF AS NVARCHAR)+'-'+CAST(E140NFV.NUMNFV AS NVARCHAR) 		
                                                                                AS ID_NF,
            COALESCE(E644LNF.NUMNFI, 0)              							AS CD_NF,
            CONVERT(VARCHAR,E140NFV.CODSNF) 									AS CD_SERIE,
            CAST(CONVERT(DATE, E640LCT.DATLCT) AS DATE) 						AS DT_EMISSAO,
            CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR) 								AS ANO_EMISSAO,
            CAST(YEAR(E640LCT.DATLCT)*100+MONTH(E640LCT.DATLCT) AS NVARCHAR)    AS ANOMES_EMISSAO,
            RIGHT('0' + CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR), 2) 			AS MES_EMISSAO,
            RIGHT('0' + CAST(DAY(E640LCT.DATLCT) AS NVARCHAR), 2) 				AS DIA_EMISSAO,
            NULL                                 								AS CD_ESTADO,
            NULL			                                                    AS CD_CIDADE,
            E001TNS.COMNAT                      								AS CD_NATUREZA,
            CASE
                WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                THEN COALESCE(E140NFV.TNSPRO, ' ')
                ELSE CASE
                         WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                         THEN COALESCE(E140NFV.TNSSER, ' ')
                         ELSE CASE
                                  WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                  THEN COALESCE(E440NFC.TNSPRO, ' ')
                                  ELSE COALESCE(E440NFC.TNSSER, '0')
                              END
                     END
            END                                 								AS CD_TNS,  
            'LANCTO MANUAL'                      								AS CD_REPRESENTANTE,
            'LANCTO MANUAL'                      								AS CD_GRUPO_CLIENTE,
            'LANCTO MANUAL'                      								AS CD_REV_PEDIDO,
            'LANCTO MANUAL'                      								AS CD_CLIENTE,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_1,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_2,
            'LANCTO MANUAL'                      								AS CD_CENTRO_CUSTOS_3,
            'LANCTO MANUAL'                      								AS CD_PRJ,
            'LANCTO MANUAL'                      								AS DS_ABR_PRJ,
            'LANCTO MANUAL'                      								AS CD_FPJ,
            'LANCTO MANUAL'                      								AS DS_ABR_FPJ,
            'LANCTO MANUAL'                      								AS CD_PEDIDO,
            'LANCTO MANUAL'                      								AS CD_CIF_FOB,
    	    'LANCTO MANUAL'                      								AS CD_TRANSPORTADORA,
            'LANCTO MANUAL'                      								AS CD_FAMILIA,
            '99999'                                 							AS CD_AGRUPAMENTO,
            'LANCTO MANUAL'                      								AS CD_PRODUTO,
            '0'                                 								AS CD_DERIVACAO,
            'LANCTO MANUAL'                      								AS CD_UNIDADE_MEDIDA,
            0                                   								AS VL_PESO_BRUTO,
            0                                   								AS VL_PESO_LIQUIDO,
            0                      									            AS QTD_PRODUTOS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '01', '02', '03' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_BRUTO,
            0                                   								AS VL_TOTAL,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '18' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_COMISSAO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '17' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_DESCONTO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '04' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_ICMS,
            0                                                                   AS VL_DIFAL,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '05' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_IPI,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '07' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_COFINS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '06' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                 							AS VL_PIS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '08' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                							AS VL_ISS,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '09' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                  							AS VL_AMOSTRA,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '10' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                   							AS VL_BONIFICACAO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '11' ) 
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                   							AS VL_FRETE,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '16' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                 									 	    AS VL_ICMSST,
            0                                   								AS VL_CUSTO,
            SUM(CASE
                    WHEN E045PLA.USU_MCTCTA IN ( '12' )
                    THEN E640LCT.VLRLCT *- 1
                    ELSE 0
                END)                                   							AS VL_DEVOLUCAO,
            0                                                                   AS VL_META
      FROM  E640LCT
INNER JOIN  E045PLA
        ON  E640LCT.CODEMP = E045PLA.CODEMP
       AND  E640LCT.CTACRE = E045PLA.CTARED
 LEFT JOIN  (SELECT  DISTINCT 
                     NUMLCT,
                     NUMNFI,
                     CODEMP,
                     CODFOR,
                     CODFIL,
                     CODSNF
               FROM  E644LNF) E644LNF
        ON  E640LCT.CODEMP = E644LNF.CODEMP
       AND  E640LCT.NUMLCT = E644LNF.NUMLCT
 LEFT JOIN  (SELECT  DISTINCT 
                     TNSPRO,
                     TNSSER,
                     NUMNFC,
                     CODSNF,
                     CODEMP,
                     CODFOR,
                     CODFIL
               FROM  E440NFC) E440NFC
        ON  E440NFC.CODEMP = E644LNF.CODEMP
       AND  E440NFC.CODFIL = E644LNF.CODFIL
       AND  E440NFC.CODFOR = E644LNF.CODFOR
       AND  E440NFC.CODSNF = E644LNF.CODSNF
       AND  E440NFC.NUMNFC = E644LNF.NUMNFI
 LEFT JOIN  (SELECT  DISTINCT 
                     TNSPRO,
                     TNSSER,
                     NUMNFV,
                     CODSNF,
                     CODEMP,
                     CODFIL
               FROM  E140NFV) E140NFV
        ON  E140NFV.CODEMP = E644LNF.CODEMP
       AND  E140NFV.CODFIL = E644LNF.CODFIL
       AND  E140NFV.CODSNF = E644LNF.CODSNF
       AND  E140NFV.NUMNFV = E644LNF.NUMNFI
 LEFT JOIN  E001TNS
        ON  CASE
                WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                THEN COALESCE(E140NFV.TNSPRO, ' ')
                ELSE CASE
                         WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                         THEN COALESCE(E140NFV.TNSSER, ' ')
                         ELSE CASE
                                  WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                  THEN COALESCE(E440NFC.TNSPRO, ' ')
                                  ELSE COALESCE(E440NFC.TNSSER, '0')
                              END
                     END
            END = E001TNS.CODTNS
       AND  E640LCT.CODEMP = E001TNS.CODEMP
     WHERE  E640LCT.SITLCT = 2
       AND  E640LCT.ORILCT = 'MAN'
       AND  CAST(CASE
                     WHEN COALESCE(E045PLA.USU_MCTCTA, ' ') = ' ' OR COALESCE(E045PLA.USU_MCTCTA, '  ') = '  '
                     THEN '0'
                     ELSE E045PLA.USU_MCTCTA
                 END AS INT) BETWEEN 1 AND 19
       AND  CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR) BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
  GROUP BY  CONVERT(VARCHAR,E640LCT.CODEMP),
            CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL),
            CAST(E140NFV.CODEMP AS NVARCHAR)+'-'+CAST(E140NFV.CODFIL AS NVARCHAR)+'-'+CAST(E140NFV.CODSNF AS NVARCHAR)+'-'+CAST(E140NFV.NUMNFV AS NVARCHAR),
            COALESCE(E644LNF.NUMNFI, 0),
            CONVERT(VARCHAR,E140NFV.CODSNF),
            CAST(CONVERT(DATE, E640LCT.DATLCT) AS DATE),
            CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR),
            CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR),
            RIGHT('0' + CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR), 2),
            RIGHT('0' + CAST(DAY(E640LCT.DATLCT) AS NVARCHAR), 2),
            E001TNS.COMNAT,
            CASE
                WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' 
                THEN COALESCE(E140NFV.TNSPRO, ' ')
                ELSE CASE
                         WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' 
                         THEN COALESCE(E140NFV.TNSSER, ' ')
                         ELSE CASE
                                  WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' 
                                  THEN COALESCE(E440NFC.TNSPRO, ' ')
                                  ELSE COALESCE(E440NFC.TNSSER, '0')
                              END
                     END
            END
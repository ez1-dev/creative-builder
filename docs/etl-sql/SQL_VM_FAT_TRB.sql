SELECT   	  'FATURAMENTO'                                 						 			AS CD_TP_MOVIMENTO,
               CONVERT(VARCHAR,E660NFV.CODEMP)													AS CD_EMPRESA,
			   CAST(E660NFV.CODEMP AS NVARCHAR) + '-' + CONVERT(VARCHAR,E660NFV.CODFIL)			AS CD_FILIAL,
			   E660INV.NUMNFI 																	AS CD_NF,
			   CAST(CONVERT(DATE, E660NFV.DATEMI) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E660NFV.DATEMI) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E660NFV.DATEMI) * 100 + MONTH(E660NFV.DATEMI) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E660NFV.DATEMI) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E660NFV.DATEMI) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               E001TNS.COMNAT																	AS CD_NATUREZA,
               'XXX'                                                                            AS CD_CENTRO_CUSTOS_3,
               'XXX'                                                                            AS CD_OBRA,
               'XXX'                                                                            AS CD_PROJETO,
               E660INV.CODTNS																	AS CD_TNS,
               E660INV.VLRCTB + E660INV.VLRINS + E660INV.VLRISS									AS VL_BRUTO,
               E660INV.VLRCTB + E660INV.VLRINS + E660INV.VLRISS									AS VL_TOTAL,
               ( E660INV.VLRDSC ) *- 1															AS VL_DESCONTO,
               ( E660INV.VLRICM ) *- 1															AS VL_ICMS,
               ( E660INV.VLRIPI ) *- 1															AS VL_IPI,
               ( E660INV.VLRCFF ) *- 1															AS VL_COFINS,
               ( E660INV.VLRPIF ) *- 1															AS VL_PIS,
               E660INV.VLRSIC *- 1																AS VL_ICMSST,
               0																				AS VL_DEVOLUCAO,
               0																			 	AS VL_AMOSTRA,
               0	 																			AS VL_BONIFICACAO,
               ( E660INV.VLRFRE ) *- 1											 				AS VL_FRETE,
               ( E660INV.VLRISS ) *- 1															AS VL_ISS
        FROM   E660INV
               INNER JOIN E660NFV
                       ON E660NFV.CODEMP = E660INV.CODEMP
                          AND E660NFV.CODFIL = E660INV.CODFIL
                          AND E660NFV.NUMNFF = E660INV.NUMNFF
                          AND E660NFV.NUMNFI = E660INV.NUMNFI
                          AND E660NFV.CODSNF = E660INV.CODSNF
                          AND E660NFV.CODCLI = E660INV.CODCLI
                          AND E660NFV.CODTNS = E660INV.CODTNS
               INNER JOIN E001TNS
                       ON E660INV.CODEMP = E001TNS.CODEMP
                          AND E660INV.CODTNS = E001TNS.CODTNS
                      	  AND E001TNS.VENFAT = 'S' 
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E054PFL A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E054PFL
                      ON E054PFL.CODTNS = E660INV.CODTNS
                         AND E054PFL.CODEMP = E660INV.CODEMP
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E053FFB A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E053FFB
                      ON E053FFB.CODTNS = E660INV.CODTNS
                         AND E053FFB.CODEMP = E660INV.CODEMP
                WHERE CAST(YEAR(E660NFV.DATEMI) * 100 + MONTH(E660NFV.DATEMI) AS NVARCHAR) BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
                                      	  AND E001TNS.CODTNS NOT IN ('5933O','6933O','5101A','6101A')
        UNION ALL
        SELECT 
        	   'DEVOLUÇÃO'                                 						 				AS CD_TP_MOVIMENTO,
               CONVERT(VARCHAR,E660INC.CODEMP)													AS CD_EMPRESA,
			   CAST(E660INC.CODEMP AS NVARCHAR) + '-' + CONVERT(VARCHAR,E660INC.CODFIL)			AS CD_FILIAL,
			   E660INC.NUMNFI																	AS CD_NF,
			   CAST(CONVERT(DATE, E660NFC.DATENT) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E660NFC.DATENT) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E660NFC.DATENT) * 100 + MONTH(E660NFC.DATENT) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E660NFC.DATENT) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E660NFC.DATENT) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               E001TNS.COMNAT																	AS CD_NATUREZA,
               'XXX'                                                                            AS CD_CENTRO_CUSTOS_3,
               'XXX'                                                                            AS CD_OBRA,
               'XXX'                                                                            AS CD_PROJETO,
               E001TNS.CODTNS																	AS CD_TNS,
               (E660INC.VLRCTB + E660INC.VLRDSC)*- 1											AS VL_BRUTO,
               E660INC.VLRCTB*- 1																AS VL_TOTAL,
               ( E660INC.VLRDSC ) *- 1															AS VL_DESCONTO,
               ( E660INC.VLRICM ) 																AS VL_ICMS,
               ( E660INC.VLRIPI ) 																AS VL_IPI,
               ( E660INC.VLRCFF ) 																AS VL_COFINS,
               ( E660INC.VLRPIF ) 																AS VL_PIS,
               E660INC.VLRSIC 																	AS VL_ICMSST,
               0																				AS VL_DEVOLUCAO,
               0																			 	AS VL_AMOSTRA,
               0	 																			AS VL_BONIFICACAO,
               ( E660INC.VLRFRE ) *- 1											 				AS VL_FRETE,
               0																				AS VL_ISS
        FROM   E660INC
               INNER JOIN E660NFC
                       ON E660NFC.CODEMP = E660INC.CODEMP
                          AND E660NFC.CODFIL = E660INC.CODFIL
                          AND E660NFC.NUMNFF = E660INC.NUMNFF
                          AND E660NFC.NUMNFI = E660INC.NUMNFI
                          AND E660NFC.CODSNF = E660INC.CODSNF
                          AND E660NFC.CODFOR = E660INC.CODFOR
                          AND E660NFC.CODTNS = E660INC.CODTNS
               INNER JOIN E001TNS
                       ON E660INC.CODEMP = E001TNS.CODEMP
                          AND E660INC.CODTNS = E001TNS.CODTNS
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E054PFL A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E054PFL
                      ON E054PFL.CODTNS = E660INC.CODTNS
                         AND E054PFL.CODEMP = E660INC.CODEMP
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E053FFB A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E053FFB
                      ON E053FFB.CODTNS = E660INC.CODTNS
                         AND E053FFB.CODEMP = E660INC.CODEMP
        WHERE  E001TNS.COMNAT IN ( '3211', '3202', '3201', '2411',
                                       '2410', '2209', '2204', '2203',
                                       '2202', '2201', '1411', '1410',
                                       '1204', '1203', '1202', '1201' )
          AND CAST(YEAR(E660NFC.DATENT) * 100 + MONTH(E660NFC.DATENT) AS NVARCHAR) BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
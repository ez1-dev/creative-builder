SELECT 	
               'FATURAMENTO'                          											AS CD_TP_MOVIMENTO,
               CONVERT(VARCHAR,E640LCT.CODEMP)													AS CD_EMPRESA,
			   CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL)				AS CD_FILIAL,
			   CAST(CONVERT(DATE, E640LCT.DATLCT) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E640LCT.DATLCT) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               E001TNS.COMNAT                      												AS CD_NATUREZA,
               'XXX'                                                                            AS CD_CENTRO_CUSTOS_3,
               'XXX'                                                                            AS CD_OBRA,
               'XXX'                                                                            AS CD_PROJETO,
               CASE
                 WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' THEN
                 COALESCE(E140NFV.TNSPRO, ' ')
                 ELSE
                   CASE
                     WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' THEN
                     COALESCE(E140NFV.TNSSER, ' ')
                     ELSE
                       CASE
                         WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' THEN
                         COALESCE(E440NFC.TNSPRO, ' ')
                         ELSE COALESCE(E440NFC.TNSSER, '0')
                       END
                   END
               END                                 												AS CD_TNS,
               COALESCE(E644LNF.NUMNFI, 0)              										AS CD_NF,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '01', '02', '03' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE
                 0
               END                             												AS VL_BRUTO,
               0                                   												AS VL_TOTAL,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '18' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 												AS VL_COMISSAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '17' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 												AS VL_DESCONTO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '04' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 												AS VL_ICMS,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '05' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_IPI,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '07' ) 
                 AND E001TNS.CODTNS NOT IN ('5933O','6933O','5101A','6101A')
                 THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_COFINS,
               
               
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '06' ) 
                 AND E001TNS.CODTNS NOT IN ('5933O','6933O','5101A','6101A')
                 THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_PIS,
               
               
               
               
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '16' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_ICMSST,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '12' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_DEVOLUCAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '09' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_AMOSTRA,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '10' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_BONIFICACAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '11' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_FRETE,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '08' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                											   AS VL_ISS
        FROM   E640LCT
               INNER JOIN E045PLA
                       ON E640LCT.CODEMP = E045PLA.CODEMP
                          AND E640LCT.CTADEB = E045PLA.CTARED
               LEFT JOIN (SELECT DISTINCT NUMLCT,
                                          NUMNFI,
                                          CODEMP,
                                          CODSNF,
                                          CODFOR,
                                          CODFIL
                          FROM   E644LNF) E644LNF
                      ON E640LCT.CODEMP = E644LNF.CODEMP
                         AND E640LCT.NUMLCT = E644LNF.NUMLCT
               LEFT JOIN (SELECT DISTINCT TNSPRO,
                                          TNSSER,
                                          NUMNFC,
                                          CODSNF,
                                          CODEMP,
                                          CODFOR,
                                          CODFIL
                          FROM   E440NFC) E440NFC
                      ON E440NFC.CODEMP = E644LNF.CODEMP
                         AND E440NFC.CODFIL = E644LNF.CODFIL
                         AND E440NFC.CODFOR = E644LNF.CODFOR
                         AND E440NFC.CODSNF = E644LNF.CODSNF
                         AND E440NFC.NUMNFC = E644LNF.NUMNFI
               LEFT JOIN (SELECT DISTINCT TNSPRO,
                                          TNSSER,
                                          NUMNFV,
                                          CODSNF,
                                          CODEMP,
                                          CODFIL
                          FROM   E140NFV) E140NFV
                      ON E140NFV.CODEMP = E644LNF.CODEMP
                         AND E140NFV.CODFIL = E644LNF.CODFIL
                         AND E140NFV.CODSNF = E644LNF.CODSNF
                         AND E140NFV.NUMNFV = E644LNF.NUMNFI
               LEFT JOIN E001TNS
                      ON CASE
                           WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' THEN
                           COALESCE(E140NFV.TNSPRO, ' ')
                           ELSE
                             CASE
                               WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' THEN
                               COALESCE(E140NFV.TNSSER, ' ')
                               ELSE
                                 CASE
                                   WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' THEN
                                   COALESCE(E440NFC.TNSPRO, ' ')
                                   ELSE COALESCE(E440NFC.TNSSER, '0')
                                 END
                             END
                         END = E001TNS.CODTNS
                         AND E640LCT.CODEMP = E001TNS.CODEMP
        WHERE  E640LCT.SITLCT = 2
               AND CAST(CASE
                               WHEN COALESCE(E045PLA.USU_MCTCTA, ' ') = ' '
                                     OR COALESCE(E045PLA.USU_MCTCTA, '  ') = '  '
                             THEN '0'
                               ELSE E045PLA.USU_MCTCTA
                             END AS INT) BETWEEN 1 AND 20
            AND CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR)  BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
        GROUP  BY E640LCT.CODEMP,
                  E640LCT.CODFIL,
                  E640LCT.DATLCT,
                  E644LNF.NUMNFI,
                  E045PLA.USU_MCTCTA,
                  E140NFV.TNSPRO,
                  E140NFV.TNSSER,
                  E440NFC.TNSPRO,
                  E440NFC.TNSSER,
                  E001TNS.COMNAT,
                  E001TNS.DESTNS,
                  E001TNS.CODTNS
                  
        UNION ALL
        
  SELECT 	
               'DEVOLUÇÃO'                          											AS CD_TP_MOVIMENTO,
               CONVERT(VARCHAR,E640LCT.CODEMP)													AS CD_EMPRESA,
			   CONVERT(VARCHAR,E640LCT.CODEMP)+'-'+CONVERT(VARCHAR,E640LCT.CODFIL)				AS CD_FILIAL,
			   CAST(CONVERT(DATE, E640LCT.DATLCT) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E640LCT.DATLCT) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E640LCT.DATLCT) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E640LCT.DATLCT) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               E001TNS.COMNAT                      												AS CD_NATUREZA,
               'XXX'                                                                            AS CD_CENTRO_CUSTOS_3,
               'XXX'                                                                            AS CD_OBRA,
               'XXX'                                                                            AS CD_PROJETO,
               CASE
                 WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' THEN
                 COALESCE(E140NFV.TNSPRO, ' ')
                 ELSE
                   CASE
                     WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' THEN
                     COALESCE(E140NFV.TNSSER, ' ')
                     ELSE
                       CASE
                         WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' THEN
                         COALESCE(E440NFC.TNSPRO, ' ')
                         ELSE COALESCE(E440NFC.TNSSER, '0')
                       END
                   END
               END                                 												AS CD_TNS,
               COALESCE(E644LNF.NUMNFI, 0)              										AS CD_NF,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '01', '02', '03','12' ) 
                 
                 THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 												AS VL_BRUTO,
               0                                   												AS VL_TOTAL,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '18' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 												AS VL_COMISSAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '17' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 												AS VL_DESCONTO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '04' ) THEN Sum(
                 E640LCT.VLRLCT)
                 ELSE 0
               END                                 												AS VL_ICMS,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '05' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_IPI,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '07' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_COFINS,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '06' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_PIS,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '16' ) THEN Sum(
                 E640LCT.VLRLCT *- 1)
                 ELSE 0
               END                                 											   AS VL_ICMSST,
               
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '12' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   
               AS VL_DEVOLUCAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '09' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_AMOSTRA,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '10' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_BONIFICACAO,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '11' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                 											   AS VL_FRETE,
               CASE
                 WHEN E045PLA.USU_MCTCTA IN ( '08' ) THEN Sum(
                 E640LCT.VLRLCT )
                 ELSE 0
               END                                											   AS VL_ISS
        FROM   E640LCT
               INNER JOIN E045PLA
                       ON E640LCT.CODEMP = E045PLA.CODEMP
                          AND E640LCT.CTACRE = E045PLA.CTARED
               LEFT JOIN (SELECT DISTINCT NUMLCT,
                                          NUMNFI,
                                          CODEMP,
                                          CODFOR,
                                          CODFIL,
                                          CODSNF
                          FROM   E644LNF) E644LNF
                      ON E640LCT.CODEMP = E644LNF.CODEMP
                         AND E640LCT.NUMLCT = E644LNF.NUMLCT
               LEFT JOIN (SELECT DISTINCT TNSPRO,
                                          TNSSER,
                                          NUMNFC,
                                          CODSNF,
                                          CODEMP,
                                          CODFOR,
                                          CODFIL
                          FROM   E440NFC) E440NFC
                      ON E440NFC.CODEMP = E644LNF.CODEMP
                         AND E440NFC.CODFIL = E644LNF.CODFIL
                         AND E440NFC.CODFOR = E644LNF.CODFOR
                         AND E440NFC.CODSNF = E644LNF.CODSNF
                         AND E440NFC.NUMNFC = E644LNF.NUMNFI
               LEFT JOIN (SELECT DISTINCT TNSPRO,
                                          TNSSER,
                                          NUMNFV,
                                          CODSNF,
                                          CODEMP,
                                          CODFIL
                          FROM   E140NFV) E140NFV
                      ON E140NFV.CODEMP = E644LNF.CODEMP
                         AND E140NFV.CODFIL = E644LNF.CODFIL
                         AND E140NFV.CODSNF = E644LNF.CODSNF
                         AND E140NFV.NUMNFV = E644LNF.NUMNFI
               LEFT JOIN E001TNS
                      ON CASE
                           WHEN COALESCE(E140NFV.TNSPRO, ' ') <> ' ' THEN
                           COALESCE(E140NFV.TNSPRO, ' ')
                           ELSE
                             CASE
                               WHEN COALESCE(E140NFV.TNSSER, ' ') <> ' ' THEN
                               COALESCE(E140NFV.TNSSER, ' ')
                               ELSE
                                 CASE
                                   WHEN COALESCE(E440NFC.TNSPRO, ' ') <> ' ' THEN
                                   COALESCE(E440NFC.TNSPRO, ' ')
                                   ELSE COALESCE(E440NFC.TNSSER, '0')
                                 END
                             END
                         END = E001TNS.CODTNS
                         AND E640LCT.CODEMP = E001TNS.CODEMP
        WHERE  E640LCT.SITLCT = 2
               AND CAST(CASE
                               WHEN COALESCE(E045PLA.USU_MCTCTA, ' ') = ' '
                                     OR COALESCE(E045PLA.USU_MCTCTA, '  ') = '  '
                             THEN '0'
                               ELSE E045PLA.USU_MCTCTA
                             END AS INT) BETWEEN 1 AND 19
            AND CAST(YEAR(E640LCT.DATLCT) * 100 + MONTH(E640LCT.DATLCT) AS NVARCHAR)  BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
	    GROUP  BY E640LCT.CODEMP,
                  E640LCT.CODFIL,
                  E640LCT.DATLCT,
                  E644LNF.NUMNFI,
                  E045PLA.USU_MCTCTA,
                  E140NFV.TNSPRO,
                  E140NFV.TNSSER,
                  E440NFC.TNSPRO,
                  E440NFC.TNSSER,
                  E001TNS.COMNAT,
                  E001TNS.DESTNS,
                  E001TNS.CODTNS
       
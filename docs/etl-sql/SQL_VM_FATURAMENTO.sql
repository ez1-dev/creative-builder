SELECT 			'SERVIÇOS'                                 						 				AS CD_TP_MOVIMENTO,
               'SERVIÇOS'                       									 		    AS CD_ORIGEM,
               CONVERT(VARCHAR,E140NFV.CODEMP)													AS CD_EMPRESA,
			   CONVERT(VARCHAR,E140NFV.CODEMP)+'-'+CONVERT(VARCHAR,E140NFV.CODFIL)				AS CD_FILIAL,
			   CAST(E140NFV.CODEMP AS NVARCHAR) + '-' + CAST(E140NFV.CODFIL AS NVARCHAR) + '-' + 
			   CAST(E140NFV.CODSNF AS NVARCHAR) + '-' + CAST(E140NFV.NUMNFV AS NVARCHAR) 		AS ID_NF,
			   CONVERT(VARCHAR,E140NFV.NUMNFV) 													AS CD_NF,
			   CONVERT(VARCHAR,E140NFV.CODSNF) 													AS CD_SERIE,
			   CAST(CONVERT(DATE, E140NFV.DATEMI) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E140NFV.DATEMI) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E140NFV.DATEMI) * 100 + MONTH(E140NFV.DATEMI) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E140NFV.DATEMI) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E140NFV.DATEMI) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               CASE
                 WHEN COALESCE(E085CLI.ESTENT, ' ') = ' ' THEN
                 COALESCE(E085CLI.SIGUFS, ' ')
                 ELSE COALESCE(E085CLI.ESTENT, ' ')
               END                                 								 	 AS CD_ESTADO,
    		   COALESCE(CONVERT(VARCHAR,CEP.CODIBG),UPPER(E085CLI.CIDCLI))			 AS CD_CIDADE,
               E001TNS.COMNAT                      									 AS CD_NATUREZA,
               E140ISV.TNSSER                      									 AS CD_TNS,
               E140NFV.CODREP                      									 AS CD_REPRESENTANTE,
			   CASE WHEN E085CLI.CODGRE = 0 THEN CONCAT('C-',CAST(E140NFV.CODCLI AS NVARCHAR))
			   ELSE CAST(E085CLI.CODGRE AS NVARCHAR)  END                            AS CD_GRUPO_CLIENTE,
               'OUTROS'                    				 							 AS CD_REV_PEDIDO,
               E140NFV.CODCLI                      									 AS CD_CLIENTE,
               E044CCU.CLACCU                      									 AS CD_CENTRO_CUSTOS,
               SUBSTRING(E044CCU.CLACCU, 1, 1)										 AS CD_CENTRO_CUSTOS_1,
               SUBSTRING(E044CCU.CLACCU, 1, 2)										 AS CD_CENTRO_CUSTOS_2,
               SUBSTRING(E044CCU.CLACCU, 1, 3)										 AS CD_CENTRO_CUSTOS_3,
               E615PRJ.NUMPRJ                      									 AS CD_PRJ,
               CAST(E615PRJ.NUMPRJ AS VARCHAR(100))
           	   + ' - '
               + E615PRJ.ABRPRJ                      								 AS DS_ABR_PRJ,
               E615FPJ.CODFPJ                      									 AS CD_FPJ,
               E615FPJ.ABRFPJ                      									 AS DS_ABR_FPJ,
               E140ISV.NUMPED                      									 AS CD_PEDIDO,
               E140NFV.CIFFOB                      									 AS CD_CIF_FOB,
    	       CAST(E140NFV.CODTRA AS NVARCHAR)									   	 AS CD_TRANSPORTADORA,
               CONVERT(VARCHAR,E140NFV.CODEMP)+'-'+E080SER.CODFAM                    AS CD_FAMILIA,
               '99999'                                 							 	 AS CD_AGRUPAMENTO,
               CONVERT(VARCHAR,E140NFV.CODEMP)+'-'+E140ISV.CODSER                    AS CD_PRODUTO,
               '0'                                 									 AS CD_DERIVACAO,
               E080SER.UNIMED                      									 AS CD_UNIDADE_MEDIDA,
               0                                   									 AS VL_PESO_BRUTO,
               0                                   									 AS VL_PESO_LIQUIDO,
               E140ISV.QTDFAT                      									 AS QTD_PRODUTOS,     
               E140ISV.VLRBRU + E140ISV.VLRIPI 
               - (E140ISV.VLRDSC + E140ISV.VLRDS1+ E140ISV.VLRDS2 + 
               	  E140ISV.VLRDS3 + E140ISV.VLRDS4 ) + E140ISV.VLROUI
               +E140ISV.VLRICS      												 AS VL_BRUTO,
               E140ISV.VLRBRU - ( E140ISV.VLRDSC + E140ISV.VLRDS1
                                 + E140ISV.VLRDS2 + E140ISV.VLRDS3
                                 + E140ISV.VLRDS4 ) + E140ISV.VLRIPI 
                                 + E140ISV.VLRICS + E140ISV.VLROUI                   AS VL_TOTAL,
               ( E140ISV.VLRCOM )             									 	 AS VL_COMISSAO,
               ( E140ISV.VLRDSC + E140ISV.VLRDS1
                 + E140ISV.VLRDS2 + E140ISV.VLRDS3
                 + E140ISV.VLRDS4 )           									     AS VL_DESCONTO,
               CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140ISV.VLRICM )*-1
				END            									   	 				 AS VL_ICMS,
               ( E140ISV.VLRDFA ) *-1            									 	 AS VL_DIFAL,
               CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140ISV.VLRIPI )*-1
				END            						 								 AS VL_IPI,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140ISV.VLRCFF )*-1
				END           									 	 				 AS VL_COFINS,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140ISV.VLRPIF )*-1
				END           									 	 				 AS VL_PIS,
               ( E140ISV.VLRISS )*-1             									 	 AS VL_ISS,
               0                                   									 AS VL_AMOSTRA,
               0                                   									 AS VL_BONIFICACAO,
               0                                   									 AS VL_FRETE,
               0                 									 	             AS VL_ISMSST,
               0                                   								     AS VL_CUSTO,
               0                                   									 AS VL_DEVOLUCAO,
               0                                                                     AS VL_META
        FROM   E140ISV
               INNER JOIN E140NFV
                       ON E140NFV.CODEMP = E140ISV.CODEMP
                          AND E140NFV.CODFIL = E140ISV.CODFIL
                          AND E140NFV.NUMNFV = E140ISV.NUMNFV
                          AND E140NFV.CODSNF = E140ISV.CODSNF
                          AND E140NFV.TIPNFS <> 0
               INNER JOIN E001TNS
                       ON E140ISV.CODEMP = E001TNS.CODEMP
                      AND E140ISV.TNSSER = E001TNS.CODTNS
                      AND E001TNS.VENFAT = 'S'              
               INNER JOIN E080SER
                       ON E140ISV.CODEMP = E080SER.CODEMP
                      AND E140ISV.CODSER = E080SER.CODSER
               INNER JOIN E085CLI
                       ON E085CLI.CODCLI = E140NFV.CODCLI              
			   LEFT JOIN E008CEP CEP
    				   ON CEP.CEPINI 	  = E085CLI.CEPINI
               LEFT JOIN E140RAT
                      ON E140RAT.CODEMP = E140ISV.CODEMP
                         AND E140RAT.CODFIL = E140ISV.CODFIL
                         AND E140RAT.CODSNF = E140ISV.CODSNF
                         AND E140RAT.NUMNFV = E140ISV.NUMNFV
                         AND E140RAT.SEQISV = E140ISV.SEQISV
               LEFT JOIN E044CCU
                      ON ( E044CCU.CODEMP = E140RAT.CODEMP
                           AND E044CCU.CODCCU = E140RAT.CODCCU )
                          OR ( E044CCU.CODEMP = E140ISV.CODEMP
                               AND E044CCU.CODCCU = E140ISV.CODCCU )
               LEFT JOIN E615PRJ
                      ON ( E615PRJ.CODEMP 	  = COALESCE(E140RAT.CODEMP, E140ISV.CODEMP)
                           AND E615PRJ.NUMPRJ = COALESCE(E140RAT.NUMPRJ,E140ISV.NUMPRJ))
               LEFT JOIN E615FPJ
                      ON (     E615FPJ.NUMPRJ = COALESCE(E140RAT.NUMPRJ,E140ISV.NUMPRJ)
                           AND E615FPJ.CODFPJ = COALESCE(E140RAT.CODFPJ, E140ISV.CODFPJ) 
                           AND E615FPJ.CODEMP = COALESCE(E140RAT.CODEMP, E140ISV.CODEMP)) 
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E054PFL A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E054PFL
                      ON E054PFL.CODTNS = E140ISV.TNSSER
                         AND E054PFL.CODEMP = E140ISV.CODEMP
               LEFT JOIN (SELECT DISTINCT Max(A.DATBAS) DATBAS,
                                          A.CODEMP,
                                          A.CODTNS
                          FROM   E053FFB A
                          GROUP  BY A.CODEMP,
                                    A.CODTNS) E053FFB
                      ON E053FFB.CODTNS = E140ISV.TNSSER
                         AND E053FFB.CODEMP = E140ISV.CODEMP
        WHERE  E140NFV.SITNFV = 2
               AND ( E140NFV.VLRFIN <> 0
                      OR E001TNS.VENFAT = 'S'
                      OR E001TNS.VENTCF = 'S'
                      OR COALESCE(E054PFL.CODTNS, 'N') <> 'N'
                      OR COALESCE(E053FFB.CODTNS, 'N') <> 'N' )
         AND SUBSTRING(E044CCU.CLACCU, 1, 3) IN ('503','502') AND E140NFV.CODCLI <> '1'
         AND CAST(YEAR(E140NFV.DATEMI) * 100 + MONTH(E140NFV.DATEMI) AS NVARCHAR)  BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
          AND E001TNS.CODTNS NOT IN ('5933O','6933O','5101A','6101A')
UNION ALL

SELECT		   'PRODUTOS'                                 						 				AS CD_TP_MOVIMENTO,
                CASE WHEN E075PRO.CODORI = '250' THEN 'MÁQUINAS' ELSE 'PEÇAS' END               AS CD_ORIGEM,
               CONVERT(VARCHAR,E140NFV.CODEMP)													AS CD_EMPRESA,
			   CAST(E140NFV.CODEMP AS NVARCHAR) + '-' + CONVERT(VARCHAR,E140NFV.CODFIL)			AS CD_FILIAL,
			   CAST(E140NFV.CODEMP AS NVARCHAR) + '-' + CAST(E140NFV.CODFIL AS NVARCHAR) + '-' + 
			   CAST(E140NFV.CODSNF AS NVARCHAR) + '-' + CAST(E140NFV.NUMNFV AS NVARCHAR) 		AS ID_NF,
			   CONVERT(VARCHAR,E140NFV.NUMNFV) 													AS CD_NF,
			   CONVERT(VARCHAR,E140NFV.CODSNF) 													AS CD_SERIE,
			   CAST(CONVERT(DATE, E140NFV.DATEMI) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E140NFV.DATEMI) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E140NFV.DATEMI) * 100 + MONTH(E140NFV.DATEMI) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E140NFV.DATEMI) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E140NFV.DATEMI) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               CASE
                 WHEN COALESCE(E085CLI.ESTENT, ' ') = ' ' THEN
                 COALESCE(E085CLI.SIGUFS, ' ')
                 ELSE COALESCE(E085CLI.ESTENT, ' ')
               END                                 								 	 AS CD_ESTADO,
    		   COALESCE(CONVERT(VARCHAR,CEP.CODIBG),UPPER(E085CLI.CIDCLI))			 AS CD_CIDADE,
               E001TNS.COMNAT                      									 AS CD_NATUREZA,
               E140IPV.TNSPRO                       							     AS CD_TNS,
               E140NFV.CODREP                      									 AS CD_REPRESENTANTE,
			   CASE WHEN E085CLI.CODGRE = 0 THEN CONCAT('C-',CAST(E140NFV.CODCLI AS NVARCHAR))
			   ELSE CAST(E085CLI.CODGRE AS NVARCHAR)  END                            AS CD_GRUPO_CLIENTE,
               COALESCE(NULLIF(TRIM(E120IPD.USU_REVPED), ''), 'OUTROS')              AS CD_REV_PEDIDO,
               E140NFV.CODCLI                      									 AS CD_CLIENTE,
               E044CCU.CLACCU                      									 AS CD_CENTRO_CUSTOS,
               SUBSTRING(E044CCU.CLACCU, 1, 1)										 AS CD_CENTRO_CUSTOS_1,
               SUBSTRING(E044CCU.CLACCU, 1, 2)										 AS CD_CENTRO_CUSTOS_2,
               SUBSTRING(E044CCU.CLACCU, 1, 3)										 AS CD_CENTRO_CUSTOS_3,
               E615PRJ.NUMPRJ                      									 AS CD_PRJ,
               CAST(E615PRJ.NUMPRJ AS VARCHAR(100))
           	   + ' - '
               + E615PRJ.ABRPRJ                      								 AS DS_ABR_PRJ,
               E615FPJ.CODFPJ                      									 AS CD_FPJ,
               E615FPJ.ABRFPJ                      									 AS DS_ABR_FPJ,
               E140IPV.NUMPED                      									 AS CD_PEDIDO,
               E140NFV.CIFFOB                      									 AS CD_CIF_FOB,
    	       CAST(E140NFV.CODTRA AS NVARCHAR)									   	 AS CD_TRANSPORTADORA,
               CAST(E140NFV.CODEMP AS NVARCHAR) + '-' + E075PRO.CODFAM               AS CD_FAMILIA,
               E013AGP.CODAGP                                 						 AS CD_AGRUPAMENTO,
               CONVERT(VARCHAR,E140NFV.CODEMP)+'-'+E140IPV.CODPRO                    AS CD_PRODUTO,
               COALESCE(E140IPV.CODDER, '0')                                		 AS CD_DERIVACAO,
               E140IPV.UNIMED                      									 AS CD_UNIDADE_MEDIDA,
               E140IPV.PESBRU                                   					 AS VL_PESO_BRUTO,
               E140IPV.PESLIQ                                  						 AS VL_PESO_LIQUIDO,
               E140IPV.QTDFAT                      									 AS QTD_PRODUTOS,     
               E140IPV.VLRBRU + E140IPV.VLRIPI 
               - (E140IPV.VLRDSC + E140IPV.VLRDS1+ E140IPV.VLRDS2 + 
               	  E140IPV.VLRDS3 + E140IPV.VLRDS4 ) + E140IPV.VLROUI
               +E140IPV.VLRICS      												 AS VL_BRUTO,
               E140IPV.VLRBRU - ( E140IPV.VLRDSC + E140IPV.VLRDS1
                                 + E140IPV.VLRDS2 + E140IPV.VLRDS3
                                 + E140IPV.VLRDS4 ) + E140IPV.VLRIPI 
                                 + E140IPV.VLRICS + E140IPV.VLROUI                   AS VL_TOTAL,
               ( E140IPV.VLRCOM )             									 	 AS VL_COMISSAO,
               ( E140IPV.VLRDSC + E140IPV.VLRDS1
                 + E140IPV.VLRDS2 + E140IPV.VLRDS3
                 + E140IPV.VLRDS4 )           									     AS VL_DESCONTO,
               CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140IPV.VLRICM )*-1
				END            									   	 				 AS VL_ICMS,
               ( E140IPV.VLRDFA )*-1             									 	 AS VL_DIFAL,
               CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140IPV.VLRIPI )*-1
				END            						 								 AS VL_IPI,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140IPV.VLRCFF )*-1
				END           									 	 				 AS VL_COFINS,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E140IPV.VLRPIF )*-1
				END           									 	 				 AS VL_PIS,
               0                             									 	 AS VL_ICSS,
               0                                   									 AS VL_AMOSTRA,
               0                                   									 AS VL_BONIFICACAO,
               E140IPV.VLRFRE                                    					 AS VL_FRETE,
               0                 									 	             AS VL_ISMSST,
               COALESCE(E210MVP.VLRMOV, 0)                                   		 AS VL_CUSTO,
               0                                   									 AS VL_DEVOLUCAO,
               0                                                                     AS VL_META
FROM   E140IPV
               INNER JOIN E140NFV
                       ON E140NFV.CODEMP = E140IPV.CODEMP
                          AND E140NFV.CODFIL = E140IPV.CODFIL
                          AND E140NFV.NUMNFV = E140IPV.NUMNFV
                          AND E140NFV.CODSNF = E140IPV.CODSNF
                          AND E140NFV.TIPNFS <> 0
               INNER JOIN E001TNS
                       ON E140IPV.CODEMP = E001TNS.CODEMP
                          AND E140IPV.TNSPRO = E001TNS.CODTNS
                      AND E001TNS.VENFAT = 'S'       
               INNER JOIN E075PRO
                       ON E140IPV.CODEMP = E075PRO.CODEMP
                          AND E140IPV.CODPRO = E075PRO.CODPRO
               LEFT JOIN (SELECT Sum(VLRMOV) VLRMOV,
                                 Sum(QTDMOV) QTDMOV,
                                 CODEMP,
                                 CODFIL,
                                 NUMNFV,
                                 SEQIPV,
                                 CODSNF
                          FROM   E210MVP
                          GROUP  BY CODEMP,
                                    CODFIL,
                                    NUMNFV,
                                    SEQIPV,
                                    CODSNF) E210MVP
                      ON E210MVP.CODEMP = E140IPV.CODEMP
                         AND E210MVP.CODFIL = E140IPV.CODFIL
                         AND E210MVP.NUMNFV = E140IPV.NUMNFV
                         AND E210MVP.SEQIPV = E140IPV.SEQIPV
                         AND E210MVP.CODSNF = E140IPV.CODSNF
               INNER JOIN E085CLI
                       ON E085CLI.CODCLI = E140NFV.CODCLI                   
			   LEFT JOIN E008CEP CEP
    				   ON CEP.CEPINI 	  = E085CLI.CEPINI
               LEFT JOIN E120IPD
                      ON E120IPD.CODEMP = E140IPV.CODEMP
                         AND E120IPD.CODFIL = E140IPV.FILPED
                         AND E120IPD.NUMPED = E140IPV.NUMPED
                         AND E120IPD.SEQIPD = E140IPV.SEQIPD
               LEFT JOIN E140RAT
                      ON E140RAT.CODEMP = E140IPV.CODEMP
                         AND E140RAT.CODFIL = E140IPV.CODFIL
                         AND E140RAT.CODSNF = E140IPV.CODSNF
                         AND E140RAT.NUMNFV = E140IPV.NUMNFV
                         AND E140RAT.SEQIPV = E140IPV.SEQIPV
               LEFT JOIN E044CCU
                      ON ( E044CCU.CODEMP = E140RAT.CODEMP
                           AND E044CCU.CODCCU = E140RAT.CODCCU )
                          OR ( E044CCU.CODEMP = E140IPV.CODEMP
                               AND E044CCU.CODCCU = E140IPV.CODCCU )
               LEFT JOIN E615PRJ
                      ON ( E615PRJ.CODEMP 	  = COALESCE(E140RAT.CODEMP, E140IPV.CODEMP)
                           AND E615PRJ.NUMPRJ = COALESCE(E140RAT.NUMPRJ,E140IPV.NUMPRJ))
               LEFT JOIN E615FPJ
                      ON (     E615FPJ.NUMPRJ = COALESCE(E140RAT.NUMPRJ,E140IPV.NUMPRJ)
                           AND E615FPJ.CODFPJ = COALESCE(E140RAT.CODFPJ, E140IPV.CODFPJ) 
                           AND E615FPJ.CODEMP = COALESCE(E140RAT.CODEMP, E140IPV.CODEMP))
               LEFT JOIN E013AGP
                      ON E075PRO.CODEMP = E013AGP.CODEMP
                         AND E075PRO.CODAGP = E013AGP.CODAGP
                         AND E013AGP.TIPAGP = 'P'
        WHERE  E140NFV.SITNFV = 2
         AND SUBSTRING(E044CCU.CLACCU, 1, 3) IN ('503','502') AND E140NFV.CODCLI <> '1'
        AND CAST(YEAR(E140NFV.DATEMI) * 100 + MONTH(E140NFV.DATEMI) AS NVARCHAR) BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
         AND E001TNS.CODTNS NOT IN ('5933O','6933O','5101A','6101A')
        
UNION ALL

SELECT		   'DEVOLUÇÃO'                                 						 				AS CD_TP_MOVIMENTO,
                CASE WHEN E075PRO.CODORI = '250' THEN 'MÁQUINAS' ELSE 'PEÇAS' END               AS CD_ORIGEM,
               CONVERT(VARCHAR,E440NFC.CODEMP)													AS CD_EMPRESA,
			   CAST(E440NFC.CODEMP AS NVARCHAR) + '-' + CONVERT(VARCHAR,E440NFC.CODFIL)			AS CD_FILIAL,
			   CAST(E440NFC.CODEMP AS NVARCHAR) + '-' + CAST(E440NFC.CODFIL AS NVARCHAR) + '-' + 
			   CAST(E440NFC.CODSNF AS NVARCHAR) + '-' + CAST(E440NFC.NUMNFC AS NVARCHAR) 		AS ID_NF,
			   CONVERT(VARCHAR,E440NFC.NUMNFC) 													AS CD_NF,
			   CONVERT(VARCHAR,E440NFC.CODSNF) 													AS CD_SERIE,
			   CAST(CONVERT(DATE, E440NFC.DATENT) AS DATE) 							 			AS DT_EMISSAO,
			   CAST(YEAR(E440NFC.DATENT) AS NVARCHAR) 								 			AS ANO_EMISSAO,
			   CAST(YEAR(E440NFC.DATENT) * 100 + MONTH(E440NFC.DATENT) AS NVARCHAR)  			AS ANOMES_EMISSAO,
			   RIGHT('0' + CAST(MONTH(E440NFC.DATENT) AS NVARCHAR), 2) 				 			AS MES_EMISSAO,
			   RIGHT('0' + CAST(DAY(E440NFC.DATENT) AS NVARCHAR), 2) 				 			AS DIA_EMISSAO,
               CASE
                 WHEN COALESCE(E085CLI.ESTENT, ' ') = ' ' THEN
                 COALESCE(E085CLI.SIGUFS, ' ')
                 ELSE COALESCE(E085CLI.ESTENT, ' ')
               END                                 								 	 AS CD_ESTADO,
    		   COALESCE(CONVERT(VARCHAR,CEP.CODIBG),UPPER(E085CLI.CIDCLI))			 AS CD_CIDADE,
               E001TNS.COMNAT                      									 AS CD_NATUREZA,
               E440IPC.TNSPRO                       							     AS CD_TNS,
               E085HCL.CODREP                      									 AS CD_REPRESENTANTE,
			   CASE WHEN E085CLI.CODGRE = 0 THEN CONCAT('C-',CAST(E085CLI.CODCLI AS NVARCHAR))
			   ELSE CAST(E085CLI.CODGRE AS NVARCHAR)  END                            AS CD_GRUPO_CLIENTE,
               'OUTROS'                   				 	 							 AS CD_REV_PEDIDO,
               E085CLI.CODCLI                      									 AS CD_CLIENTE,
               E044CCU.CLACCU                      									 AS CD_CENTRO_CUSTOS,
               SUBSTRING(E044CCU.CLACCU, 1, 1)										 AS CD_CENTRO_CUSTOS_1,
               SUBSTRING(E044CCU.CLACCU, 1, 2)										 AS CD_CENTRO_CUSTOS_2,
               SUBSTRING(E044CCU.CLACCU, 1, 3)										 AS CD_CENTRO_CUSTOS_3,
               E615PRJ.NUMPRJ                      									 AS CD_PRJ,
               CAST(E615PRJ.NUMPRJ AS VARCHAR(100))
           	   + ' - '
               + E615PRJ.ABRPRJ                      								 AS DS_ABR_PRJ,
               E615FPJ.CODFPJ                      									 AS CD_FPJ,
               E615FPJ.ABRFPJ                      									 AS DS_ABR_FPJ,
               E440IPC.NUMPED                      									 AS CD_PEDIDO,
               E440NFC.CIFFOB                      									 AS CD_CIF_FOB,
    	       CAST(E440NFC.CODTRA AS NVARCHAR)									   	 AS CD_TRANSPORTADORA,
               CAST(E440NFC.CODEMP AS NVARCHAR) + '-' + E075PRO.CODFAM               AS CD_FAMILIA,
               E013AGP.CODAGP                                 						 AS CD_AGRUPAMENTO,
               CAST(E440NFC.CODEMP AS NVARCHAR) + '-' + E440IPC.CODPRO               AS CD_PRODUTO,
               COALESCE(E440IPC.CODDER, '0')                                		 AS CD_DERIVACAO,
               E440IPC.UNIMED                      									 AS CD_UNIDADE_MEDIDA,
               E440IPC.PESBRU*-1                                   					 AS VL_PESO_BRUTO,
               E440IPC.PESLIQ*-1                                  					 AS VL_PESO_LIQUIDO,
               E440IPC.QTDDEV*-1                      								 AS QTD_PRODUTOS,
               ( E440IPC.VLRBRU + CASE WHEN E440IPC.VECIPI <> 0 THEN
                 E440IPC.VECIPI
                 ELSE
                 0 *
                 CASE
                 WHEN E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV /
                 E140IPV.QTDFAT
                 END
                 END +
                 CASE WHEN E440IPC.VLRICS <> 0 THEN E440IPC.VLRICS ELSE 0 * CASE
                 WHEN
                 E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV / E140IPV.QTDFAT
                 END END
                 - (
                   E440IPC.VLRDSC + E440IPC.VLRDS1
                   +
                   E440IPC.VLRDS2 + E440IPC.VLRDS3
                   +
                   E440IPC.VLRDS4 ) + E440IPC.VLROUI ) *- 1
               AS VL_BRUTO,
               ( E440IPC.VLRBRU + CASE WHEN E440IPC.VECIPI <> 0 THEN
                 E440IPC.VECIPI
                 ELSE
                 0 *
                 CASE
                 WHEN E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV /
                 E140IPV.QTDFAT
                 END
                 END +
                 CASE WHEN E440IPC.VLRICS <> 0 THEN E440IPC.VLRICS ELSE 0 * CASE
                 WHEN
                 E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV / E140IPV.QTDFAT
                 END END
                 - (
                   E440IPC.VLRDSC + E440IPC.VLRDS1
                   +
                   E440IPC.VLRDS2 + E440IPC.VLRDS3
                   +
                   E440IPC.VLRDS4 ) + E440IPC.VLROUI ) *- 1                          AS VL_TOTAL,
               0            									 	 				 AS VL_COMISSAO,
               ( E440IPC.VLRDSC + E440IPC.VLRDS1
                 + E440IPC.VLRDS2 + E440IPC.VLRDS3
                 + E440IPC.VLRDS4 )         									     AS VL_DESCONTO,
                CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E440IPC.VECICM )
				END            									   	 				 AS VL_ICMS,
               ( E440IPC.VLRDFA )             									 	 AS VL_DIFAL,
               CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E440IPC.VECIPI )
				END            						 								 AS VL_IPI,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E440IPC.VLRCOR )
				END           									 	 				 AS VL_COFINS,
				CASE
				  WHEN (E001TNS.CODTNS) IN ('5949A','6949A','5949D','6949D','5101A','5949G','6949G','5949N','6949N','5949O','6949O')
				        OR (E001TNS.COMNAT) IN ( '6910', '5910', '6912', '5912' ) THEN 0
				  ELSE (E440IPC.VLRPIS )
				END           									 	 				 AS VL_PIS,
               0                                   									 AS VL_ISS,
               0                                   									 AS VL_AMOSTRA,
               0                                   									 AS VL_BONIFICACAO,
               E440IPC.VLRFRE*-1                                    			     AS VL_FRETE,
               0                 									 	             AS VL_ISMSST,
               COALESCE(E210MVP.VLRMOV, 0)*-1                                   	 AS VL_CUSTO,
               ( E440IPC.VLRBRU + CASE WHEN E440IPC.VECIPI <> 0 THEN
                 E440IPC.VECIPI
                 ELSE
                 0 *
                 CASE
                 WHEN E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV /
                 E140IPV.QTDFAT
                 END
                 END +
                 CASE WHEN E440IPC.VLRICS <> 0 THEN E440IPC.VLRICS ELSE 0 * CASE
                 WHEN
                 E140IPV.QTDDEV = 0 THEN 1 ELSE E140IPV.QTDDEV / E140IPV.QTDFAT
                 END END
                 - (
                   E440IPC.VLRDSC + E440IPC.VLRDS1
                   +
                   E440IPC.VLRDS2 + E440IPC.VLRDS3
                   +
                   E440IPC.VLRDS4 ) + E440IPC.VLROUI )                              AS VL_DEVOLUCAO,
               0                                                                    AS VL_META
FROM   E440IPC
               INNER JOIN E440NFC
                       ON E440NFC.CODEMP = E440IPC.CODEMP
                          AND E440NFC.CODFIL = E440IPC.CODFIL
                          AND E440NFC.NUMNFC = E440IPC.NUMNFC
                          AND E440NFC.CODSNF = E440IPC.CODSNF
                          AND E440NFC.CODFOR = E440IPC.CODFOR
               INNER JOIN E001TNS
                       ON E440IPC.CODEMP = E001TNS.CODEMP
                          AND E440IPC.TNSPRO = E001TNS.CODTNS
               INNER JOIN E075PRO
                       ON E440IPC.CODEMP = E075PRO.CODEMP
                          AND E440IPC.CODPRO = E075PRO.CODPRO
               LEFT JOIN E095FOR
                      ON E095FOR.CODFOR = E440NFC.CODFOR
               LEFT JOIN E085CLI
                      ON E085CLI.CODCLI = E095FOR.CODCLI
               LEFT JOIN E085HCL
                      ON E085CLI.CODCLI = E085HCL.CODCLI
                         AND E440NFC.CODEMP = E085HCL.CODEMP
                         AND E440NFC.CODFIL = E085HCL.CODFIL
               LEFT JOIN E210MVP
                      ON E210MVP.CODEMP = E440IPC.CODEMP
                         AND E210MVP.FILNFC = E440IPC.CODFIL
                         AND E210MVP.NUMNFC = E440IPC.NUMNFC
                         AND E210MVP.SEQIPC = E440IPC.SEQIPC
                         AND E210MVP.CODFOR = E440IPC.CODFOR
                         AND E210MVP.SNFNFC = E440IPC.CODSNF
               LEFT JOIN E440RAT
                      ON E440RAT.CODEMP = E440IPC.CODEMP
                         AND E440RAT.CODFIL = E440IPC.CODFIL
                         AND E440RAT.CODSNF = E440IPC.CODSNF
                         AND E440RAT.CODFOR = E440IPC.CODFOR
                         AND E440RAT.NUMNFC = E440IPC.NUMNFC
                         AND E440RAT.SEQIPC = E440IPC.SEQIPC
               LEFT JOIN E044CCU
                      ON ( E044CCU.CODEMP = E440RAT.CODEMP
                           AND E044CCU.CODCCU = E440RAT.CODCCU )
                          OR ( E044CCU.CODEMP = E440IPC.CODEMP
                               AND E044CCU.CODCCU = E440IPC.CODCCU )
               LEFT JOIN E615PRJ
                      ON ( E615PRJ.CODEMP 	  = COALESCE(E440RAT.CODEMP,E440IPC.CODEMP)
                           AND E615PRJ.NUMPRJ = COALESCE(E440RAT.NUMPRJ,E440IPC.NUMPRJ))
               LEFT JOIN E615FPJ
                      ON (     E615FPJ.NUMPRJ = COALESCE(E440RAT.NUMPRJ,E440IPC.NUMPRJ)
                           AND E615FPJ.CODFPJ = COALESCE(E440RAT.CODFPJ, E440IPC.CODFPJ) 
                           AND E615FPJ.CODEMP = COALESCE(E440RAT.CODEMP, E440IPC.CODEMP))         
               LEFT JOIN E013AGP
                      ON E075PRO.CODAGP = E013AGP.CODAGP
                         AND E075PRO.CODEMP = E013AGP.CODEMP
                         AND E013AGP.TIPAGP = 'P'
               LEFT JOIN E140IPV
                      ON E140IPV.NUMNFV = E440IPC.NUMNFV
                         AND E140IPV.CODEMP = E440IPC.EMPNFV
                         AND E140IPV.CODFIL = E440IPC.FILNFV
                         AND E140IPV.SEQIPV = E440IPC.SEQIPV
                         AND E140IPV.CODSNF = E440IPC.SNFNFV                   
			   LEFT JOIN E008CEP CEP
    				   ON CEP.CEPINI 	  = E085CLI.CEPINI
        WHERE  E440NFC.SITNFC = 2 AND E085HCL.CODCLI <> '1'
               AND ( E001TNS.COMNAT IN ( '3211', '3202', '3201', '2411',
                                       '2410', '2209', '2204', '2203',
                                       '2202', '2201', '1411', '1410',
                                       '1204', '1203', '1202', '1201' )
                                       OR E440IPC.TNSPRO = '1201E')
         AND SUBSTRING(E044CCU.CLACCU, 1, 3) IN ('503','502')
         AND CAST(YEAR(E440NFC.DATENT) *100 + MONTH(E440NFC.DATENT) AS NVARCHAR)  BETWEEN $[ANOMES_INI] AND $[ANOMES_FIM]
        


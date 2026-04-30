-- Backfill uf_destino a partir do dicionário de cidades para registros existentes
UPDATE public.passagens_aereas p
SET uf_destino = m.uf
FROM (VALUES
  -- Capitais
  ('RIO BRANCO','AC'), ('MACEIO','AL'), ('MACAPA','AP'), ('MANAUS','AM'),
  ('SALVADOR','BA'), ('FORTALEZA','CE'), ('BRASILIA','DF'), ('VITORIA','ES'),
  ('GOIANIA','GO'), ('SAO LUIS','MA'), ('CUIABA','MT'), ('CAMPO GRANDE','MS'),
  ('BELO HORIZONTE','MG'), ('BELEM','PA'), ('JOAO PESSOA','PB'), ('CURITIBA','PR'),
  ('RECIFE','PE'), ('TERESINA','PI'), ('RIO DE JANEIRO','RJ'), ('NATAL','RN'),
  ('PORTO ALEGRE','RS'), ('PORTO VELHO','RO'), ('BOA VISTA','RR'),
  ('FLORIANOPOLIS','SC'), ('SAO PAULO','SP'), ('ARACAJU','SE'), ('PALMAS','TO'),
  -- Demais cidades
  ('CAMPINAS','SP'), ('CHAPECO','SC'), ('GUARAPUAVA','PR'), ('GUARULHOS','SP'),
  ('ITABUNA','BA'), ('ITAITUBA','PA'), ('ITARARE','SP'), ('ITIRAPINA','SP'),
  ('ITUIUTABA','MG'), ('JUAZEIRO DO NORTE','CE'), ('OSASCO','SP'),
  ('PARANAGUA','PR'), ('PIRACICABA','SP'), ('RIO GRANDE','RS'), ('SANTAREM','PA'),
  ('SANTOS','SP'), ('SAO FRANCISCO DO SUL','SC'), ('SAO JOSE DOS PINHAIS','PR'),
  ('JOINVILLE','SC'), ('CASCAVEL','PR'), ('LONDRINA','PR'), ('MARINGA','PR'),
  ('UBERLANDIA','MG'), ('RIBEIRAO PRETO','SP'), ('SAO JOSE DO RIO PRETO','SP'),
  ('PETROLINA','PE'), ('JUAZEIRO','BA'), ('IMPERATRIZ','MA')
) AS m(cidade, uf)
WHERE p.uf_destino IS NULL
  AND p.destino IS NOT NULL
  AND regexp_replace(
        translate(
          UPPER(TRIM(p.destino)),
          'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
          'AAAAAEEEEIIIIOOOOOUUUUC'
        ),
        '\s+', ' ', 'g'
      ) = m.cidade;
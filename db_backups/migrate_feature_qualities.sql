INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.shopping, fq.shopping, fq.shopping, fq.shopping from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'shopping'
  AND fq.shopping = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.culinary, fq.culinary, fq.culinary, fq.culinary from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'culinary'
  AND fq.culinary = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.wintersports, fq.wintersports, fq.wintersports, fq.wintersports from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'wintersports'
  AND fq.wintersports = 0;

INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.entertainment, fq.entertainment, fq.entertainment, fq.entertainment from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'entertainment'
  AND fq.entertainment = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.culture, fq.culture, fq.culture, fq.culture from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'culture'
  AND fq.culture = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.beach, fq.beach, fq.beach, fq.beach from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'beach'
  AND fq.beach = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.hiking, fq.hiking, fq.hiking, fq.hiking from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'hiking'
  AND fq.hiking = 0;


INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.cities, fq.cities, fq.cities, fq.cities from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'cities'
  AND fq.cities = 0;

INSERT INTO `sys`.`feature2region`
(`feature_id`,
`region_id`,
`quality_spring`,
`quality_summer`,
`quality_autumn`,
`quality_winter`)
SELECT f.id, r.id, fq.nature, fq.nature, fq.nature, fq.nature from sys.features f, sys.regions r, sys.feature_qualities fq
WHERE fq.id = r.feature_quality_id
  AND f.key = 'nature'
  AND fq.nature = 0;

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
  AND fq.shopping > 0;

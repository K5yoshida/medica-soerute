-- ===========================================
-- Migration: Copy keyword data to media_keywords
-- Date: 2024-12-09
-- Description:
--   keywordsテーブルのmax_monthly_search_volume, max_cpcを
--   media_keywordsにコピー
-- ===========================================

-- keywordsテーブルからデータをコピー
UPDATE media_keywords mk
SET
  monthly_search_volume = k.max_monthly_search_volume,
  cpc = k.max_cpc
FROM keywords k
WHERE mk.keyword_id = k.id
AND mk.monthly_search_volume IS NULL;

-- 結果確認用
DO $$
DECLARE
  v_count INTEGER;
  v_with_volume INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM media_keywords;
  SELECT COUNT(*) INTO v_with_volume FROM media_keywords WHERE monthly_search_volume IS NOT NULL;
  RAISE NOTICE 'media_keywords total: %, with volume: %', v_count, v_with_volume;
END
$$;

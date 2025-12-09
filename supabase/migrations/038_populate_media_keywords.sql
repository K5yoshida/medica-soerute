-- ===========================================
-- Migration: Populate media_keywords
-- Date: 2024-12-09
-- Description:
--   既存のキーワードをmedia_keywordsテーブルに紐付け
--   インポートジョブで指定されたmedia_idに基づいて紐付けを復元
-- ===========================================

-- インポートジョブで使用されたmedia_id: 901258f7-b3bc-4961-95c2-a7856eab7e28
-- これはインフルックスの媒体ID

-- 既存のすべてのキーワードをmedia_keywordsに追加
-- （重複は無視）
INSERT INTO media_keywords (keyword_id, media_id, source_file)
SELECT
  k.id as keyword_id,
  '901258f7-b3bc-4961-95c2-a7856eab7e28'::uuid as media_id,
  'migration_038_restore' as source_file
FROM keywords k
WHERE NOT EXISTS (
  SELECT 1 FROM media_keywords mk
  WHERE mk.keyword_id = k.id
  AND mk.media_id = '901258f7-b3bc-4961-95c2-a7856eab7e28'::uuid
);

-- 結果確認用
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM media_keywords;
  RAISE NOTICE 'media_keywords count after migration: %', v_count;
END
$$;

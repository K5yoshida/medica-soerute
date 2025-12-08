-- ===========================================
-- Migration: Add query_id to keywords table
-- Date: 2024-12
-- Description:
--   - keywordsテーブルにquery_id外部キーを追加
--   - 既存データをkeyword文字列でquery_masterと紐付け
--   - 外部キー制約とインデックスを追加
-- ===========================================

-- ===========================================
-- 1. query_idカラム追加
-- ===========================================

ALTER TABLE keywords
ADD COLUMN IF NOT EXISTS query_id UUID REFERENCES query_master(id) ON DELETE SET NULL;

-- ===========================================
-- 2. 既存データの紐付け
-- ===========================================

-- キーワードを正規化してquery_masterと紐付け
UPDATE keywords k
SET query_id = qm.id
FROM query_master qm
WHERE k.query_id IS NULL
  AND LOWER(TRIM(REGEXP_REPLACE(k.keyword, '\s+', ' ', 'g'))) = qm.keyword_normalized;

-- ===========================================
-- 3. インデックス追加
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_keywords_query_id ON keywords(query_id);

-- ===========================================
-- 4. コメント追加
-- ===========================================

COMMENT ON COLUMN keywords.query_id IS 'query_masterテーブルへの外部キー。intent/query_type情報を参照';

-- ===========================================
-- 完了
-- ===========================================

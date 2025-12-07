-- ===========================================
-- Migration: Add Query Type Column
-- Date: 2024-12
-- Description:
--   - query_masterにSEO標準のクエリタイプカラムを追加
--   - query_type: Do/Know/Go/Buy の4分類
-- ===========================================

-- ===========================================
-- 1. 新規カラム追加
-- ===========================================

-- query_type: SEO標準のクエリタイプ（Do/Know/Go/Buy）
ALTER TABLE query_master
ADD COLUMN IF NOT EXISTS query_type VARCHAR(10);

-- ===========================================
-- 2. インデックス追加
-- ===========================================

-- クエリタイプでのフィルタ用
CREATE INDEX IF NOT EXISTS idx_query_master_query_type ON query_master(query_type);

-- ===========================================
-- 3. 既存データのquery_type推定（intentから）
-- ===========================================

-- branded → Go（特定サイトへ行きたい）
UPDATE query_master
SET query_type = 'Go'
WHERE query_type IS NULL
  AND intent = 'branded';

-- transactional → Do（行動したい：応募）
UPDATE query_master
SET query_type = 'Do'
WHERE query_type IS NULL
  AND intent = 'transactional';

-- commercial → Buy（購入検討：比較検討）
UPDATE query_master
SET query_type = 'Buy'
WHERE query_type IS NULL
  AND intent = 'commercial';

-- informational → Know（知りたい）
UPDATE query_master
SET query_type = 'Know'
WHERE query_type IS NULL
  AND intent = 'informational';

-- b2b → Know（法人向け情報収集）
-- 注: b2bはintentカラムがVARCHARの場合のみ該当
-- intent::text = 'b2b' で文字列比較を行う
UPDATE query_master
SET query_type = 'Know'
WHERE query_type IS NULL
  AND intent::text = 'b2b';

-- ===========================================
-- 4. コメント追加
-- ===========================================

COMMENT ON COLUMN query_master.query_type IS 'SEO標準クエリタイプ（Do/Know/Go/Buy）';

-- ===========================================
-- 完了
-- ===========================================

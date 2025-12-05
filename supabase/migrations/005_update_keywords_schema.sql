-- ===========================================
-- MEDICA SOERUTE - Update Keywords Schema
-- ===========================================
-- ラッコキーワード形式に合わせてkeywordsテーブルを更新

-- ===========================================
-- keywordsテーブルのカラム変更
-- ===========================================

-- 1. intentカラムを削除（ラッコキーワードにはない）
ALTER TABLE keywords DROP COLUMN IF EXISTS intent;

-- 2. カラム名変更
-- search_volume → monthly_search_volume
ALTER TABLE keywords RENAME COLUMN search_volume TO monthly_search_volume;

-- 3. rank → search_rank
ALTER TABLE keywords RENAME COLUMN rank TO search_rank;

-- 4. cpc → cpc_usd（ドル単位であることを明確に）
ALTER TABLE keywords RENAME COLUMN cpc TO cpc_usd;

-- 5. estimated_trafficは同じなのでそのまま

-- 6. インデックスの再作成（カラム名変更に対応）
DROP INDEX IF EXISTS idx_keywords_intent;
DROP INDEX IF EXISTS idx_keywords_search_volume;
DROP INDEX IF EXISTS idx_keywords_rank;

CREATE INDEX IF NOT EXISTS idx_keywords_monthly_search_volume ON keywords(monthly_search_volume DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_keywords_search_rank ON keywords(search_rank);
CREATE INDEX IF NOT EXISTS idx_keywords_estimated_traffic ON keywords(estimated_traffic DESC NULLS LAST);

-- ===========================================
-- 既存のサンプルデータを削除（新しい形式で再投入するため）
-- ===========================================
TRUNCATE TABLE keywords;


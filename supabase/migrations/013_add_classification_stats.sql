-- ===========================================
-- Migration: Add classification_stats to import_jobs
-- Date: 2024-12
-- Description:
--   - classification_stats: 分類処理の詳細統計情報を追加
-- ===========================================

-- classification_stats カラムを追加
ALTER TABLE import_jobs
ADD COLUMN IF NOT EXISTS classification_stats JSONB;

-- コメント追加
COMMENT ON COLUMN import_jobs.classification_stats IS '分類統計: {db_existing, rule_classified, ai_classified, new_records, updated_records}';

-- ===========================================
-- 完了
-- ===========================================

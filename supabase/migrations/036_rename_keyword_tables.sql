-- ===========================================
-- Migration: Rename Keyword Tables
-- Date: 2024-12
-- Description:
--   キーワード関連テーブルのリネーム
--   1. keywords → keywords_legacy（旧設計、廃止予定）
--   2. query_master → keywords（新設計、キーワードマスター）
--   3. media_query_data → media_keywords（媒体×キーワード紐付け）
--   4. query_id → keyword_id（外部キー名変更）
-- ===========================================

-- ===========================================
-- Step 1: 旧 keywords テーブルを keywords_legacy にリネーム
-- ===========================================

-- RLSポリシーを削除（リネーム前に削除が必要）
DROP POLICY IF EXISTS "Authenticated users can view keywords" ON keywords;
DROP POLICY IF EXISTS "Admins can manage keywords" ON keywords;
DROP POLICY IF EXISTS "keywords_admin_manage" ON keywords;

-- テーブルをリネーム
ALTER TABLE IF EXISTS keywords RENAME TO keywords_legacy;

-- インデックスをリネーム
ALTER INDEX IF EXISTS idx_keywords_media_id RENAME TO idx_keywords_legacy_media_id;
ALTER INDEX IF EXISTS idx_keywords_keyword RENAME TO idx_keywords_legacy_keyword;
ALTER INDEX IF EXISTS idx_keywords_intent RENAME TO idx_keywords_legacy_intent;
ALTER INDEX IF EXISTS idx_keywords_search_volume RENAME TO idx_keywords_legacy_search_volume;
ALTER INDEX IF EXISTS idx_keywords_rank RENAME TO idx_keywords_legacy_rank;

-- トリガーをリネーム（トリガーはDROP/CREATEで対応）
DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords_legacy;
CREATE TRIGGER update_keywords_legacy_updated_at
  BEFORE UPDATE ON keywords_legacy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーを再作成（新しいテーブル名で）
CREATE POLICY "keywords_legacy_select_authenticated" ON keywords_legacy
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "keywords_legacy_admin_manage" ON keywords_legacy
  FOR ALL
  USING (public.is_admin());

-- ===========================================
-- Step 2: query_master を keywords にリネーム
-- ===========================================

-- RLSポリシーを削除
DROP POLICY IF EXISTS "query_master_select_all" ON query_master;
DROP POLICY IF EXISTS "query_master_select_authenticated" ON query_master;
DROP POLICY IF EXISTS "query_master_insert_admin" ON query_master;
DROP POLICY IF EXISTS "query_master_update_admin" ON query_master;
DROP POLICY IF EXISTS "query_master_delete_admin" ON query_master;

-- テーブルをリネーム
ALTER TABLE IF EXISTS query_master RENAME TO keywords;

-- 制約をリネーム
ALTER TABLE keywords RENAME CONSTRAINT uniq_keyword_normalized TO keywords_keyword_normalized_key;

-- インデックスをリネーム
ALTER INDEX IF EXISTS idx_query_master_keyword RENAME TO idx_keywords_keyword;
ALTER INDEX IF EXISTS idx_query_master_intent RENAME TO idx_keywords_intent;
ALTER INDEX IF EXISTS idx_query_master_search_volume RENAME TO idx_keywords_search_volume;

-- トリガーをリネーム
DROP TRIGGER IF EXISTS update_query_master_updated_at ON keywords;
CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーを再作成
CREATE POLICY "keywords_select_authenticated" ON keywords
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "keywords_insert_admin" ON keywords
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "keywords_update_admin" ON keywords
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "keywords_delete_admin" ON keywords
  FOR DELETE
  USING (public.is_admin());

-- ===========================================
-- Step 3: media_query_data を media_keywords にリネーム
-- ===========================================

-- RLSポリシーを削除
DROP POLICY IF EXISTS "media_query_data_select_all" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_select_authenticated" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_insert_admin" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_update_admin" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_delete_admin" ON media_query_data;

-- テーブルをリネーム
ALTER TABLE IF EXISTS media_query_data RENAME TO media_keywords;

-- カラムをリネーム（query_id → keyword_id）
ALTER TABLE media_keywords RENAME COLUMN query_id TO keyword_id;

-- 制約をリネーム
ALTER TABLE media_keywords RENAME CONSTRAINT uniq_media_query TO media_keywords_media_id_keyword_id_key;

-- 外部キー制約をリネーム（DROP/ADD で対応）
ALTER TABLE media_keywords DROP CONSTRAINT IF EXISTS media_query_data_query_id_fkey;
ALTER TABLE media_keywords DROP CONSTRAINT IF EXISTS media_query_data_media_id_fkey;

ALTER TABLE media_keywords
  ADD CONSTRAINT media_keywords_keyword_id_fkey
  FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE;

ALTER TABLE media_keywords
  ADD CONSTRAINT media_keywords_media_id_fkey
  FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;

-- インデックスをリネーム
ALTER INDEX IF EXISTS idx_media_query_data_query_id RENAME TO idx_media_keywords_keyword_id;
ALTER INDEX IF EXISTS idx_media_query_data_media_id RENAME TO idx_media_keywords_media_id;
ALTER INDEX IF EXISTS idx_media_query_data_ranking RENAME TO idx_media_keywords_ranking;
ALTER INDEX IF EXISTS idx_media_query_data_traffic RENAME TO idx_media_keywords_traffic;

-- トリガーをリネーム
DROP TRIGGER IF EXISTS update_media_query_data_updated_at ON media_keywords;
CREATE TRIGGER update_media_keywords_updated_at
  BEFORE UPDATE ON media_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーを再作成
CREATE POLICY "media_keywords_select_authenticated" ON media_keywords
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "media_keywords_insert_admin" ON media_keywords
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "media_keywords_update_admin" ON media_keywords
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "media_keywords_delete_admin" ON media_keywords
  FOR DELETE
  USING (public.is_admin());

-- ===========================================
-- Step 4: ヘルパー関数の更新
-- ===========================================

-- upsert_query 関数を upsert_keyword にリネーム・更新
DROP FUNCTION IF EXISTS upsert_query(TEXT, query_intent, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION upsert_keyword(
  p_keyword TEXT,
  p_intent query_intent DEFAULT 'unknown',
  p_intent_confidence VARCHAR(10) DEFAULT 'low',
  p_intent_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_normalized TEXT;
  v_id UUID;
BEGIN
  v_normalized := normalize_keyword(p_keyword);

  INSERT INTO keywords (keyword, keyword_normalized, intent, intent_confidence, intent_reason, intent_updated_at)
  VALUES (p_keyword, v_normalized, p_intent, p_intent_confidence, p_intent_reason, NOW())
  ON CONFLICT (keyword_normalized) DO UPDATE SET
    intent = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent
      ELSE keywords.intent
    END,
    intent_confidence = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent_confidence
      ELSE keywords.intent_confidence
    END,
    intent_reason = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent_reason
      ELSE keywords.intent_reason
    END,
    intent_updated_at = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN NOW()
      ELSE keywords.intent_updated_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Step 5: コメント追加（テーブルの目的を明確化）
-- ===========================================

COMMENT ON TABLE keywords IS 'キーワードマスター：検索キーワードと意図分類を管理。複数媒体で共有される。';
COMMENT ON TABLE media_keywords IS '媒体別キーワードデータ：媒体とキーワードの紐付け、SEOデータを保持。';
COMMENT ON TABLE keywords_legacy IS '【廃止予定】旧キーワードテーブル。移行完了後に削除。';

-- ===========================================
-- 完了
-- ===========================================

-- ===========================================
-- P3-1: テーブル名統一
-- analysis_results → matching_results
-- ===========================================
-- 設計書: 12_DB一覧 では matching_results として定義されている
-- 実装との整合性を取るためリネーム

-- 1. テーブル名を変更
ALTER TABLE analysis_results RENAME TO matching_results;

-- 2. インデックス名を変更
ALTER INDEX idx_analysis_results_user_id RENAME TO idx_matching_results_user_id;
ALTER INDEX idx_analysis_results_status RENAME TO idx_matching_results_status;
ALTER INDEX idx_analysis_results_created_at RENAME TO idx_matching_results_created_at;

-- 3. トリガー名を変更（トリガーは関数に依存するため、一度削除して再作成）
DROP TRIGGER IF EXISTS update_analysis_results_updated_at ON matching_results;

CREATE TRIGGER update_matching_results_updated_at
  BEFORE UPDATE ON matching_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RLSポリシー名を変更（ポリシーは直接リネームできないため、削除して再作成）
-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view own analysis" ON matching_results;
DROP POLICY IF EXISTS "Users can create own analysis" ON matching_results;
DROP POLICY IF EXISTS "Users can update own analysis" ON matching_results;
DROP POLICY IF EXISTS "Admins can view all analysis" ON matching_results;

-- 新しいポリシー名で再作成
CREATE POLICY "Users can view own matching results"
  ON matching_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own matching results"
  ON matching_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own matching results"
  ON matching_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all matching results"
  ON matching_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

-- 5. コメントを追加
COMMENT ON TABLE matching_results IS '媒体マッチング分析結果。設計書: 12_DB一覧 matching_results';

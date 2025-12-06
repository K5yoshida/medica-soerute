-- ===========================================
-- Migration: Add Verification Columns
-- Date: 2024-12
-- Description:
--   - query_masterにキーワード検証機能用のカラムを追加
--   - is_verified: 人的検証済みフラグ
--   - verified_by: 検証者（users.id）
--   - verified_at: 検証日時
--   - classification_source: 分類ソース（rule/ai/manual）
-- ===========================================

-- ===========================================
-- 1. 新規カラム追加
-- ===========================================

-- is_verified: 人的検証済みフラグ
-- trueの場合、CSVインポート時に分類が上書きされない
ALTER TABLE query_master
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;

-- verified_by: 検証を行ったユーザーID
ALTER TABLE query_master
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- verified_at: 検証日時
ALTER TABLE query_master
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- classification_source: 分類ソース（rule/ai/manual/unknown）
-- rule: ルールベース分類
-- ai: Claude AI分類
-- manual: 管理者による手動分類
-- unknown: 分類ソース不明（既存データ）
ALTER TABLE query_master
ADD COLUMN IF NOT EXISTS classification_source VARCHAR(20) DEFAULT 'unknown' NOT NULL;

-- ===========================================
-- 2. インデックス追加
-- ===========================================

-- 検証状態でのフィルタ用
CREATE INDEX IF NOT EXISTS idx_query_master_is_verified ON query_master(is_verified);

-- 分類ソースでのフィルタ用
CREATE INDEX IF NOT EXISTS idx_query_master_classification_source ON query_master(classification_source);

-- 検証日時での並び替え用
CREATE INDEX IF NOT EXISTS idx_query_master_verified_at ON query_master(verified_at DESC NULLS LAST);

-- ===========================================
-- 3. 既存データのclassification_source推定
-- ===========================================

-- ルールベース分類の特徴的な理由を持つものを'rule'に
UPDATE query_master
SET classification_source = 'rule'
WHERE classification_source = 'unknown'
  AND (
    intent_reason LIKE '%キーワードを含む%'
    OR intent_reason LIKE '%職種と条件の組み合わせ%'
    OR intent_reason LIKE '%具体的な数値条件%'
    OR intent_reason LIKE '%比較・評価系キーワード%'
    OR intent_reason LIKE '%条件キーワード単体%'
  );

-- AI分類の特徴（confidence=highでintentが設定済み、かつルールに該当しないもの）を'ai'に
UPDATE query_master
SET classification_source = 'ai'
WHERE classification_source = 'unknown'
  AND intent_confidence = 'high'
  AND intent IS NOT NULL
  AND intent != 'unknown';

-- ===========================================
-- 4. コメント追加
-- ===========================================

COMMENT ON COLUMN query_master.is_verified IS '人的検証済みフラグ。trueの場合、CSVインポート時に分類が上書きされない';
COMMENT ON COLUMN query_master.verified_by IS '検証を行ったユーザーID';
COMMENT ON COLUMN query_master.verified_at IS '検証日時';
COMMENT ON COLUMN query_master.classification_source IS '分類ソース（rule/ai/manual/unknown）';

-- ===========================================
-- 完了
-- ===========================================

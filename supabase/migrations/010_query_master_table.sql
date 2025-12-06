-- ===========================================
-- Migration: Query Master Table
-- Date: 2024-12
-- Description:
--   - query_master: 検索クエリのマスターテーブル
--   - media_query_data: 媒体×クエリの紐付けデータ
--   - 意図分類（intent）を持ち、複数媒体で重複排除
-- ===========================================

-- ===========================================
-- 1. ENUM型の作成
-- ===========================================

-- クエリ意図の種類（存在しない場合のみ作成）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'query_intent') THEN
    CREATE TYPE query_intent AS ENUM (
      'branded',        -- 指名検索（サービス名・施設名）
      'transactional',  -- 応募直前（求人・転職意図が明確）
      'commercial',     -- 比較検討（条件比較、選び方）
      'informational',  -- 情報収集（知識・ハウツー）
      'unknown'         -- 未分類（AI判定必要）
    );
  END IF;
END
$$;

-- ===========================================
-- 2. query_master テーブル
-- ===========================================

CREATE TABLE IF NOT EXISTS query_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- クエリ情報
  keyword TEXT NOT NULL,                          -- 検索キーワード（正規化済み）
  keyword_normalized TEXT NOT NULL,               -- 小文字・スペース統一版（重複チェック用）

  -- 意図分類
  intent query_intent DEFAULT 'unknown' NOT NULL, -- 意図分類
  intent_confidence VARCHAR(10) DEFAULT 'low',    -- high/medium/low
  intent_reason TEXT,                             -- 分類理由
  intent_updated_at TIMESTAMPTZ,                  -- 意図が更新された日時

  -- 集計データ（全媒体合計ではなく最大値を保持）
  max_monthly_search_volume INTEGER,              -- 最大月間検索数
  max_cpc DECIMAL(10, 2),                         -- 最大CPC

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- ユニーク制約（正規化されたキーワードで重複排除）
  CONSTRAINT uniq_keyword_normalized UNIQUE (keyword_normalized)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_query_master_keyword ON query_master(keyword);
CREATE INDEX IF NOT EXISTS idx_query_master_intent ON query_master(intent);
CREATE INDEX IF NOT EXISTS idx_query_master_search_volume ON query_master(max_monthly_search_volume DESC);

-- ===========================================
-- 3. media_query_data テーブル（媒体×クエリの紐付け）
-- ===========================================

CREATE TABLE IF NOT EXISTS media_query_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 外部キー
  query_id UUID NOT NULL REFERENCES query_master(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_master(id) ON DELETE CASCADE,

  -- 媒体固有のデータ
  ranking_position INTEGER,                       -- 検索順位
  monthly_search_volume INTEGER,                  -- 月間検索数
  estimated_traffic INTEGER,                      -- 推定流入数
  cpc DECIMAL(10, 2),                             -- CPC
  competition_level INTEGER,                      -- 競合性（0-100）
  seo_difficulty INTEGER,                         -- SEO難易度
  landing_url TEXT,                               -- ランディングURL

  -- インポート情報
  imported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- インポート日時
  source_file TEXT,                               -- ソースファイル名

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 媒体×クエリはユニーク
  CONSTRAINT uniq_media_query UNIQUE (media_id, query_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_media_query_data_query_id ON media_query_data(query_id);
CREATE INDEX IF NOT EXISTS idx_media_query_data_media_id ON media_query_data(media_id);
CREATE INDEX IF NOT EXISTS idx_media_query_data_ranking ON media_query_data(ranking_position);
CREATE INDEX IF NOT EXISTS idx_media_query_data_traffic ON media_query_data(estimated_traffic DESC);

-- ===========================================
-- 4. RLS設定
-- ===========================================

ALTER TABLE query_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_query_data ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（冪等性のため）
DROP POLICY IF EXISTS "query_master_select_all" ON query_master;
DROP POLICY IF EXISTS "query_master_insert_admin" ON query_master;
DROP POLICY IF EXISTS "query_master_update_admin" ON query_master;
DROP POLICY IF EXISTS "query_master_delete_admin" ON query_master;
DROP POLICY IF EXISTS "media_query_data_select_all" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_insert_admin" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_update_admin" ON media_query_data;
DROP POLICY IF EXISTS "media_query_data_delete_admin" ON media_query_data;

-- query_master: 全ユーザーが読み取り可能、adminのみ書き込み可能
CREATE POLICY "query_master_select_all" ON query_master
  FOR SELECT USING (true);

CREATE POLICY "query_master_insert_admin" ON query_master
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "query_master_update_admin" ON query_master
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "query_master_delete_admin" ON query_master
  FOR DELETE USING (public.is_admin());

-- media_query_data: 全ユーザーが読み取り可能、adminのみ書き込み可能
CREATE POLICY "media_query_data_select_all" ON media_query_data
  FOR SELECT USING (true);

CREATE POLICY "media_query_data_insert_admin" ON media_query_data
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "media_query_data_update_admin" ON media_query_data
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "media_query_data_delete_admin" ON media_query_data
  FOR DELETE USING (public.is_admin());

-- ===========================================
-- 5. updated_at トリガー
-- ===========================================

CREATE TRIGGER update_query_master_updated_at
  BEFORE UPDATE ON query_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_query_data_updated_at
  BEFORE UPDATE ON media_query_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 6. ヘルパー関数
-- ===========================================

-- キーワードを正規化する関数
CREATE OR REPLACE FUNCTION normalize_keyword(p_keyword TEXT)
RETURNS TEXT AS $$
BEGIN
  -- 小文字化、前後スペース削除、連続スペースを1つに
  RETURN LOWER(TRIM(REGEXP_REPLACE(p_keyword, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- クエリをUPSERTする関数
CREATE OR REPLACE FUNCTION upsert_query(
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

  INSERT INTO query_master (keyword, keyword_normalized, intent, intent_confidence, intent_reason, intent_updated_at)
  VALUES (p_keyword, v_normalized, p_intent, p_intent_confidence, p_intent_reason, NOW())
  ON CONFLICT (keyword_normalized) DO UPDATE SET
    intent = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND query_master.intent_confidence != 'high'
      THEN EXCLUDED.intent
      ELSE query_master.intent
    END,
    intent_confidence = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND query_master.intent_confidence != 'high'
      THEN EXCLUDED.intent_confidence
      ELSE query_master.intent_confidence
    END,
    intent_reason = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND query_master.intent_confidence != 'high'
      THEN EXCLUDED.intent_reason
      ELSE query_master.intent_reason
    END,
    intent_updated_at = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND query_master.intent_confidence != 'high'
      THEN NOW()
      ELSE query_master.intent_updated_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 完了
-- ===========================================

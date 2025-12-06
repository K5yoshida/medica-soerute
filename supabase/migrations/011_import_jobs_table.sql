-- ===========================================
-- Migration: Import Jobs Table
-- Date: 2024-12
-- Description:
--   - import_jobs: 非同期インポートジョブ管理テーブル
--   - Inngestベースの非同期処理の進捗・状態を追跡
-- ===========================================

-- ===========================================
-- 1. ENUM型の作成
-- ===========================================

-- インポートジョブのステータス
CREATE TYPE import_job_status AS ENUM (
  'pending',      -- 待機中（ジョブ作成直後）
  'processing',   -- 処理中
  'completed',    -- 完了
  'failed',       -- 失敗
  'cancelled'     -- キャンセル
);

-- インポートの種類
CREATE TYPE import_type AS ENUM (
  'rakko_keywords',  -- ラッコキーワード
  'similarweb'       -- SimilarWeb
);

-- ===========================================
-- 2. import_jobs テーブル
-- ===========================================

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ステータス
  status import_job_status NOT NULL DEFAULT 'pending',

  -- ファイル情報
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,

  -- インポート設定
  import_type import_type NOT NULL,
  media_id UUID REFERENCES media_master(id) ON DELETE SET NULL,

  -- 進捗情報
  total_rows INTEGER,                           -- 総行数
  processed_rows INTEGER DEFAULT 0,             -- 処理済み行数
  success_count INTEGER DEFAULT 0,              -- 成功件数
  error_count INTEGER DEFAULT 0,                -- エラー件数
  current_step VARCHAR(50),                     -- 現在のステップ（parse/rule_classification/ai_classification/db_insert/finalize）

  -- 意図分類サマリ
  intent_summary JSONB,                         -- {"branded": 10, "transactional": 50, ...}

  -- エラー情報
  error_message TEXT,                           -- エラーメッセージ
  error_details JSONB,                          -- 詳細エラー（行番号、内容など）

  -- Inngest連携
  inngest_run_id TEXT,                          -- InngestのRun ID

  -- 実行者
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- タイムスタンプ
  started_at TIMESTAMPTZ,                       -- 処理開始日時
  completed_at TIMESTAMPTZ,                     -- 処理完了日時
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===========================================
-- 3. インデックス
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_import_type ON import_jobs(import_type);

-- ===========================================
-- 4. RLS設定
-- ===========================================

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- adminは全てのジョブを操作可能
CREATE POLICY "import_jobs_admin_all" ON import_jobs
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 一般ユーザーは自分のジョブのみ参照可能
CREATE POLICY "import_jobs_owner_select" ON import_jobs
  FOR SELECT USING (
    auth.uid() = created_by
    OR public.is_admin()
  );

-- ===========================================
-- 5. updated_at トリガー
-- ===========================================

CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 6. 進捗更新用関数
-- ===========================================

-- 進捗を更新する関数（Inngestから呼び出される）
CREATE OR REPLACE FUNCTION update_import_job_progress(
  p_job_id UUID,
  p_processed_rows INTEGER,
  p_success_count INTEGER,
  p_error_count INTEGER,
  p_current_step VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  UPDATE import_jobs
  SET
    processed_rows = p_processed_rows,
    success_count = p_success_count,
    error_count = p_error_count,
    current_step = p_current_step,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ジョブを完了状態にする関数
CREATE OR REPLACE FUNCTION complete_import_job(
  p_job_id UUID,
  p_success_count INTEGER,
  p_error_count INTEGER,
  p_intent_summary JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE import_jobs
  SET
    status = 'completed',
    success_count = p_success_count,
    error_count = p_error_count,
    intent_summary = p_intent_summary,
    current_step = 'finalize',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ジョブを失敗状態にする関数
CREATE OR REPLACE FUNCTION fail_import_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE import_jobs
  SET
    status = 'failed',
    error_message = p_error_message,
    error_details = p_error_details,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ジョブをキャンセルする関数
CREATE OR REPLACE FUNCTION cancel_import_job(
  p_job_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_status import_job_status;
BEGIN
  SELECT status INTO v_status FROM import_jobs WHERE id = p_job_id;

  -- pending または processing 状態のみキャンセル可能
  IF v_status IN ('pending', 'processing') THEN
    UPDATE import_jobs
    SET
      status = 'cancelled',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. Realtime有効化
-- ===========================================

-- import_jobsテーブルのリアルタイム更新を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE import_jobs;

-- ===========================================
-- 完了
-- ===========================================

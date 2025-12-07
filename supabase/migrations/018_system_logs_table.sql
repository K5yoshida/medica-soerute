-- ===========================================
-- System Logs Table
-- システムログテーブル
-- 設計書: 19_エラーカタログと監視ポリシー - 19.5 ログ設計
-- ===========================================

-- システムログテーブル（監視モジュール用）
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  category TEXT NOT NULL CHECK (category IN ('auth', 'api', 'system', 'billing', 'user', 'external', 'job', 'security')),
  message TEXT NOT NULL,
  request_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT,
  duration_ms INTEGER,
  error_code TEXT,
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_error_code ON system_logs(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- 複合インデックス（レベル+日時でのフィルタリング用）
CREATE INDEX IF NOT EXISTS idx_system_logs_level_timestamp ON system_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_timestamp ON system_logs(category, timestamp DESC);

-- RLS有効化
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- ポリシー: adminのみ全ログ閲覧可能
CREATE POLICY "system_logs_admin_view" ON system_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ポリシー: サービスロールのみ書き込み可能
CREATE POLICY "system_logs_service_insert" ON system_logs
  FOR INSERT
  WITH CHECK (true);

-- 統計ビュー: ログレベル別カウント（直近24時間）
CREATE OR REPLACE VIEW v_system_logs_stats_24h AS
SELECT
  level,
  category,
  COUNT(*) as count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as count_1h,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as count_24h
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY level, category;

-- 統計ビュー: エラーコード別カウント（直近24時間）
CREATE OR REPLACE VIEW v_error_code_stats_24h AS
SELECT
  error_code,
  COUNT(*) as count,
  MAX(created_at) as last_occurred_at
FROM system_logs
WHERE error_code IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;

-- コメント
COMMENT ON TABLE system_logs IS 'システムログ（監視モジュール用）- 設計書19.5準拠';
COMMENT ON COLUMN system_logs.level IS 'ログレベル: error, warn, info, debug';
COMMENT ON COLUMN system_logs.category IS 'カテゴリ: auth, api, system, billing, user, external, job, security';
COMMENT ON COLUMN system_logs.request_id IS 'リクエスト追跡用ID';
COMMENT ON COLUMN system_logs.action IS '実行アクション名（例: matching.analyze）';
COMMENT ON COLUMN system_logs.duration_ms IS '処理時間（ミリ秒）';
COMMENT ON COLUMN system_logs.error_code IS 'エラーコード（E-AUTH-001形式）';

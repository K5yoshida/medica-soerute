-- ===========================================
-- User Sessions Table for Concurrent Login Control
-- ===========================================
-- 設計書: 23_セキュリティ設計書 - 同時ログイン制御
-- GAP-003: 同時ログイン制御実装
--
-- 方式: 最新セッションのみ有効
-- - 新規ログイン時に既存セッションを無効化
-- - ミドルウェアでセッション有効性を検証
-- ===========================================

-- ===========================================
-- User Sessions Table
-- ===========================================

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  is_valid BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT
);

-- インデックス
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id_valid ON user_sessions(user_id, is_valid) WHERE is_valid = true;

-- RLS Policy
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッションのみ参照可能
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- サービスロールのみ挿入・更新・削除可能（APIから操作）
CREATE POLICY "Service role can manage sessions"
  ON user_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- 管理者は全セッション参照可能
CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- Helper Functions
-- ===========================================

-- 古いセッションを無効化する関数
CREATE OR REPLACE FUNCTION invalidate_user_sessions(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'new_login'
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET
    is_valid = false,
    invalidated_at = NOW(),
    invalidated_reason = p_reason
  WHERE user_id = p_user_id
    AND is_valid = true;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セッション有効性チェック関数
CREATE OR REPLACE FUNCTION is_session_valid(
  p_session_token TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sessions
    WHERE session_token = p_session_token
      AND is_valid = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セッション最終アクティブ更新関数
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_token TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions
  SET last_active_at = NOW()
  WHERE session_token = p_session_token
    AND is_valid = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Cleanup: 30日以上前の無効セッションを削除
-- ===========================================

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE is_valid = false
    AND invalidated_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント
COMMENT ON TABLE user_sessions IS '同時ログイン制御用セッション管理テーブル';
COMMENT ON COLUMN user_sessions.session_token IS 'Supabase JWTのjtiまたはランダム生成トークン';
COMMENT ON COLUMN user_sessions.is_valid IS '有効なセッションかどうか（falseの場合は無効化済み）';
COMMENT ON COLUMN user_sessions.invalidated_reason IS '無効化理由: new_login, logout, admin_revoke, expired';

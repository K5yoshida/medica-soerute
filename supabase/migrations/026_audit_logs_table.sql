-- ===========================================
-- P3-2: 監査ログテーブル作成
-- 設計書: 12_DB一覧 - audit_logs
-- ===========================================
-- 管理者によるデータ変更操作を記録するテーブル
-- セキュリティ監査・コンプライアンス対応用

-- 1. audit_logs テーブル作成
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 操作を行ったユーザー
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 操作種別: create, update, delete, login, logout, export など
  action_type TEXT NOT NULL,
  -- 対象リソース種別: user, media, analysis, settings など
  resource_type TEXT NOT NULL,
  -- 対象リソースID
  resource_id UUID,
  -- 変更前の値（JSON形式）
  old_value JSONB,
  -- 変更後の値（JSON形式）
  new_value JSONB,
  -- クライアントIPアドレス
  ip_address INET,
  -- ユーザーエージェント
  user_agent TEXT,
  -- 追加メタデータ（リクエストパス、セッションID等）
  metadata JSONB DEFAULT '{}',
  -- 作成日時
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. インデックス作成
-- ユーザー別検索用
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
-- 操作種別検索用
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
-- リソース種別検索用
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
-- リソースID検索用
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
-- 日時検索用（降順）
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- 複合インデックス（管理画面での絞り込み用）
CREATE INDEX idx_audit_logs_type_date ON audit_logs(action_type, created_at DESC);

-- 3. RLS有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー
-- 管理者のみ参照可能（監査ログは一般ユーザーには非公開）
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

-- システム（サービスロール）による挿入を許可
-- 注: 通常のユーザーは直接挿入できない。APIから挿入する場合はサービスロールを使用
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- 監査ログは更新・削除不可（イミュータブル）
-- UPDATE/DELETEポリシーは作成しない

-- 5. コメント
COMMENT ON TABLE audit_logs IS '監査ログ。管理者操作やセキュリティイベントを記録。設計書: 12_DB一覧';
COMMENT ON COLUMN audit_logs.action_type IS '操作種別: create, update, delete, login, logout, export, password_reset など';
COMMENT ON COLUMN audit_logs.resource_type IS '対象リソース種別: user, media, analysis, settings, session など';
COMMENT ON COLUMN audit_logs.old_value IS '変更前の値（機密情報は除外またはマスク）';
COMMENT ON COLUMN audit_logs.new_value IS '変更後の値（機密情報は除外またはマスク）';

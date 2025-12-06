-- ===========================================
-- Migration: Update Role and Plan Schema
-- Date: 2024-12
-- Description:
--   - ロールを3種類に変更: admin, internal, user
--   - プランを5種類に変更: medica, enterprise, trial, starter, professional
--   - trial_ends_at カラム追加
--   - allowed_domains テーブル追加
-- ===========================================

-- ===========================================
-- 0. 依存するRLSポリシーを一時的に削除
-- ===========================================

-- media_documents のポリシー
DROP POLICY IF EXISTS "media_documents_insert_policy" ON media_documents;
DROP POLICY IF EXISTS "media_documents_update_policy" ON media_documents;
DROP POLICY IF EXISTS "media_documents_delete_policy" ON media_documents;

-- users のポリシー
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- media_master のポリシー
DROP POLICY IF EXISTS "Admins can manage media" ON media_master;

-- analysis_results のポリシー
DROP POLICY IF EXISTS "Admins can view all analysis" ON analysis_results;

-- usage_logs のポリシー
DROP POLICY IF EXISTS "Admins can view all logs" ON usage_logs;

-- keywords のポリシー
DROP POLICY IF EXISTS "Admins can manage keywords" ON keywords;

-- traffic_data のポリシー
DROP POLICY IF EXISTS "Admins can manage traffic_data" ON traffic_data;

-- ===========================================
-- 1. ENUM値の更新（PostgreSQL では直接変更できないため、新規作成してマイグレーション）
-- ===========================================

-- 1.1 新しいロールENUM型を作成
CREATE TYPE user_role_new AS ENUM ('admin', 'internal', 'user');

-- 1.2 新しいプランENUM型を作成
CREATE TYPE plan_type_new AS ENUM ('medica', 'enterprise', 'trial', 'starter', 'professional');

-- ===========================================
-- 2. users テーブルの更新
-- ===========================================

-- 2.1 trial_ends_at カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2.2 ロールカラムを新しいENUM型に変更
ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE user_role_new USING (
    CASE role::text
      WHEN 'super_admin' THEN 'admin'::user_role_new
      WHEN 'admin' THEN 'admin'::user_role_new
      WHEN 'user' THEN 'user'::user_role_new
      ELSE 'user'::user_role_new
    END
  ),
  ALTER COLUMN role SET DEFAULT 'user'::user_role_new;

-- 2.3 プランカラムを新しいENUM型に変更
ALTER TABLE users
  ALTER COLUMN plan DROP DEFAULT,
  ALTER COLUMN plan TYPE plan_type_new USING (
    CASE plan::text
      WHEN 'free' THEN 'trial'::plan_type_new
      WHEN 'light' THEN 'starter'::plan_type_new
      WHEN 'standard' THEN 'starter'::plan_type_new
      WHEN 'premium' THEN 'professional'::plan_type_new
      ELSE 'trial'::plan_type_new
    END
  ),
  ALTER COLUMN plan SET DEFAULT 'trial'::plan_type_new;

-- 2.4 古いENUM型を削除して新しい名前にリネーム
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;

ALTER TYPE user_role_new RENAME TO user_role;
ALTER TYPE plan_type_new RENAME TO plan_type;

-- 2.5 trial_ends_at のインデックス作成
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);

-- ===========================================
-- 3. allowed_domains テーブルの作成
-- ===========================================

CREATE TABLE IF NOT EXISTS allowed_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('medica', 'enterprise')),
  organization_name VARCHAR(255),
  max_users INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS uniq_allowed_domains_domain ON allowed_domains(domain);

-- RLS有効化
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: adminのみ参照・編集可能
CREATE POLICY "allowed_domains_select_admin" ON allowed_domains
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "allowed_domains_insert_admin" ON allowed_domains
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "allowed_domains_update_admin" ON allowed_domains
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "allowed_domains_delete_admin" ON allowed_domains
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 匿名ユーザー（登録時のドメインチェック用）がドメインを検索可能にする
-- ※ 登録処理はサーバーサイドで行うため service_role で実行
CREATE POLICY "allowed_domains_anon_select" ON allowed_domains
  FOR SELECT USING (true);

-- updated_at トリガー
CREATE TRIGGER update_allowed_domains_updated_at
  BEFORE UPDATE ON allowed_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 4. 初期データ投入
-- ===========================================

-- medicaドメインを登録
INSERT INTO allowed_domains (domain, plan, organization_name)
VALUES ('medica.co.jp', 'medica', 'メディカ株式会社')
ON CONFLICT (domain) DO NOTHING;

-- ===========================================
-- 5. RLSポリシーの更新（super_admin → admin に統一）
-- ===========================================

-- 既存のポリシーを削除して再作成
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage media" ON media_master;
DROP POLICY IF EXISTS "Admins can view all analysis" ON analysis_results;
DROP POLICY IF EXISTS "Admins can view all logs" ON usage_logs;

-- 新しいポリシー（admin のみ）
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage media" ON media_master
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all analysis" ON analysis_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all logs" ON usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ===========================================
-- 6. handle_new_user関数の更新（ドメイン認証対応）
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_domain TEXT;
  v_allowed_domain RECORD;
  v_role user_role;
  v_plan plan_type;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  -- メールからドメインを抽出
  v_domain := split_part(NEW.email, '@', 2);

  -- allowed_domains テーブルを検索
  SELECT * INTO v_allowed_domain
  FROM allowed_domains
  WHERE domain = v_domain;

  IF v_allowed_domain IS NOT NULL THEN
    -- ドメインが登録されている場合: internal + 指定プラン
    v_role := 'internal'::user_role;
    v_plan := v_allowed_domain.plan::plan_type;
    v_trial_ends_at := NULL;
  ELSE
    -- ドメインが登録されていない場合: user + trial（14日間）
    v_role := 'user'::user_role;
    v_plan := 'trial'::plan_type;
    v_trial_ends_at := NOW() + INTERVAL '14 days';
  END IF;

  INSERT INTO public.users (id, email, role, plan, trial_ends_at)
  VALUES (NEW.id, NEW.email, v_role, v_plan, v_trial_ends_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. プラン別の月間制限を設定する関数
-- ===========================================

CREATE OR REPLACE FUNCTION get_plan_limit(p_plan plan_type)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'medica' THEN -1          -- 無制限
    WHEN 'enterprise' THEN -1      -- 無制限
    WHEN 'trial' THEN -1           -- 無制限（期間制限あり）
    WHEN 'starter' THEN 20         -- 月20回
    WHEN 'professional' THEN -1    -- 無制限
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===========================================
-- 8. media_documents のRLSポリシーを再作成
-- ===========================================

CREATE POLICY "media_documents_insert_policy" ON media_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "media_documents_update_policy" ON media_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "media_documents_delete_policy" ON media_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ===========================================
-- 9. keywords と traffic_data のRLSポリシーを再作成
-- ===========================================

-- keywords の管理者ポリシー
CREATE POLICY "Admins can manage keywords" ON keywords
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- traffic_data の管理者ポリシー
CREATE POLICY "Admins can manage traffic_data" ON traffic_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- 完了
-- ===========================================

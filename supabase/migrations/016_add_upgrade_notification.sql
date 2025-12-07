-- ===========================================
-- Migration: Add Upgrade Notification
-- Date: 2024-12
-- Description:
--   法人プランへのアップグレード通知機能を追加
--   - users テーブルに upgrade_notified_at カラム追加
--   - handle_new_user 関数を更新
-- ===========================================

-- ===========================================
-- 1. users テーブルにカラム追加
-- ===========================================

-- upgrade_notified_at: 法人プラン通知を確認した日時
-- NULL = 未確認（通知表示対象）
-- 値あり = 確認済み（通知表示しない）
ALTER TABLE users ADD COLUMN IF NOT EXISTS upgrade_notified_at TIMESTAMPTZ;

-- コメント追加
COMMENT ON COLUMN users.upgrade_notified_at IS '法人プランアップグレード通知を確認した日時。NULLの場合は未確認で通知表示対象。';

-- ===========================================
-- 2. 既存ユーザーのデフォルト値設定
-- ===========================================

-- 既存のinternalユーザーは通知済みとして扱う（過去に通知が必要だった場合を除外）
-- trial/starter/professional ユーザーは通知不要なのでNOW()
UPDATE users
SET upgrade_notified_at = NOW()
WHERE upgrade_notified_at IS NULL;

-- ===========================================
-- 3. handle_new_user 関数の更新
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_domain TEXT;
  v_allowed_domain RECORD;
  v_role user_role;
  v_plan plan_type;
  v_trial_ends_at TIMESTAMPTZ;
  v_upgrade_notified_at TIMESTAMPTZ;
BEGIN
  -- メールからドメインを抽出
  v_domain := split_part(NEW.email, '@', 2);

  -- allowed_domains テーブルを検索
  SELECT * INTO v_allowed_domain
  FROM allowed_domains
  WHERE domain = v_domain;

  IF v_allowed_domain IS NOT NULL THEN
    -- ドメインが登録されている場合: internal + 指定プラン
    -- 法人ドメインユーザーには通知を表示（upgrade_notified_at = NULL）
    v_role := 'internal'::user_role;
    v_plan := v_allowed_domain.plan::plan_type;
    v_trial_ends_at := NULL;
    v_upgrade_notified_at := NULL;  -- 通知未確認
  ELSE
    -- ドメインが登録されていない場合: user + trial（14日間）
    -- トライアルユーザーには通知不要（upgrade_notified_at = NOW()）
    v_role := 'user'::user_role;
    v_plan := 'trial'::plan_type;
    v_trial_ends_at := NOW() + INTERVAL '14 days';
    v_upgrade_notified_at := NOW();  -- 通知不要
  END IF;

  INSERT INTO public.users (id, email, role, plan, trial_ends_at, upgrade_notified_at)
  VALUES (NEW.id, NEW.email, v_role, v_plan, v_trial_ends_at, v_upgrade_notified_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 完了
-- ===========================================

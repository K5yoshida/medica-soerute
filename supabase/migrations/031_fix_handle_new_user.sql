-- ===========================================
-- Migration: Fix handle_new_user Function
-- Date: 2024-12
-- Description:
--   handle_new_user 関数のエラーハンドリングを改善
--   allowed_domains テーブルへのアクセス権限問題を修正
-- ===========================================

-- ===========================================
-- 1. handle_new_user 関数の更新（エラーハンドリング改善）
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
  -- SECURITY DEFINER関数なのでRLSはバイパスされる
  BEGIN
    SELECT * INTO v_allowed_domain
    FROM allowed_domains
    WHERE domain = v_domain;
  EXCEPTION WHEN OTHERS THEN
    -- allowed_domains アクセスエラーの場合はデフォルト値を使用
    v_allowed_domain := NULL;
    RAISE WARNING 'handle_new_user: Error accessing allowed_domains: %', SQLERRM;
  END;

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

  -- usersテーブルへの挿入
  BEGIN
    INSERT INTO public.users (id, email, role, plan, trial_ends_at, upgrade_notified_at)
    VALUES (NEW.id, NEW.email, v_role, v_plan, v_trial_ends_at, v_upgrade_notified_at);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_user: Failed to insert user (id=%, email=%, role=%, plan=%): %',
      NEW.id, NEW.email, v_role, v_plan, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. 関数のオーナーを明示的に設定
-- ===========================================

-- postgres ユーザーに関数のオーナーを変更（SECURITY DEFINER が正しく機能するため）
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- ===========================================
-- 完了
-- ===========================================

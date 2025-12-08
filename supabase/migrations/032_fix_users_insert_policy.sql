-- ===========================================
-- Migration: Fix Users Insert Policy
-- Date: 2024-12
-- Description:
--   users テーブルへのINSERT権限問題を修正
--   handle_new_user トリガー関数がRLSをバイパスできるようにする
-- ===========================================

-- ===========================================
-- 1. users テーブルにサービスロール用のINSERTポリシーを追加
-- ===========================================

-- 既存のINSERTポリシーがあれば削除
DROP POLICY IF EXISTS "users_insert_service" ON users;
DROP POLICY IF EXISTS "users_insert_trigger" ON users;

-- サービスロール（トリガー関数）からのINSERTを許可
-- SECURITY DEFINER関数はRLSをバイパスするが、念のため
CREATE POLICY "users_insert_service" ON users
  FOR INSERT
  WITH CHECK (true);

-- ===========================================
-- 2. handle_new_user 関数を再作成（RLS完全バイパス）
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- この関数はSECURITY DEFINERなのでRLSはバイパスされる
  BEGIN
    SELECT * INTO v_allowed_domain
    FROM public.allowed_domains
    WHERE domain = v_domain;
  EXCEPTION WHEN OTHERS THEN
    -- エラー時はデフォルト値を使用
    v_allowed_domain := NULL;
    RAISE WARNING 'handle_new_user: Error accessing allowed_domains for domain %: %', v_domain, SQLERRM;
  END;

  IF v_allowed_domain IS NOT NULL THEN
    -- ドメインが登録されている場合: internal + 指定プラン
    v_role := 'internal'::user_role;
    v_plan := v_allowed_domain.plan::plan_type;
    v_trial_ends_at := NULL;
    v_upgrade_notified_at := NULL;  -- 通知未確認
  ELSE
    -- ドメインが登録されていない場合: user + trial（14日間）
    v_role := 'user'::user_role;
    v_plan := 'trial'::plan_type;
    v_trial_ends_at := NOW() + INTERVAL '14 days';
    v_upgrade_notified_at := NOW();  -- 通知不要
  END IF;

  -- usersテーブルへの挿入
  BEGIN
    INSERT INTO public.users (id, email, role, plan, trial_ends_at, upgrade_notified_at)
    VALUES (NEW.id, NEW.email, v_role, v_plan, v_trial_ends_at, v_upgrade_notified_at);
  EXCEPTION
    WHEN unique_violation THEN
      -- 重複エラーの場合はスキップ（既存ユーザー）
      RAISE WARNING 'handle_new_user: User already exists (email=%)', NEW.email;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'handle_new_user: Failed to insert user (id=%, email=%, role=%, plan=%): %',
        NEW.id, NEW.email, v_role, v_plan, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 3. 関数のオーナーと権限を設定
-- ===========================================

-- postgres ユーザーに関数のオーナーを変更
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ===========================================
-- 4. allowed_domains テーブルへのアクセス権限を確認
-- ===========================================

-- service_role からの読み取りを許可（トリガー用）
GRANT SELECT ON public.allowed_domains TO service_role;
GRANT SELECT ON public.allowed_domains TO postgres;

-- ===========================================
-- 5. users テーブルへの挿入権限
-- ===========================================

-- service_role からの挿入を許可
GRANT INSERT ON public.users TO service_role;
GRANT INSERT ON public.users TO postgres;

-- ===========================================
-- 完了
-- ===========================================

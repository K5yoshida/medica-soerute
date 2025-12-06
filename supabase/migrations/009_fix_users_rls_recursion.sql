-- ===========================================
-- Migration: Fix Users RLS Infinite Recursion
-- Date: 2024-12
-- Description:
--   usersテーブルのRLSポリシーで無限再帰が発生していた問題を修正
--   管理者チェックをSECURITY DEFINER関数で行うように変更
-- ===========================================

-- ===========================================
-- 1. 管理者チェック用の関数を作成（RLS回避のためSECURITY DEFINER）
-- ===========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===========================================
-- 2. usersテーブルのRLSポリシーを修正
-- ===========================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- 新しいポリシー: 自分のデータまたは管理者なら全員のデータを見られる
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- 新しいポリシー: 自分のデータを更新できる
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 新しいポリシー: 管理者は全員のデータを更新できる
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (public.is_admin());

-- ===========================================
-- 3. 他のテーブルのRLSポリシーも同様に修正
-- ===========================================

-- media_master
DROP POLICY IF EXISTS "Admins can manage media" ON media_master;
CREATE POLICY "media_master_admin_manage" ON media_master
  FOR ALL USING (public.is_admin());

-- analysis_results
DROP POLICY IF EXISTS "Admins can view all analysis" ON analysis_results;
CREATE POLICY "analysis_results_admin_view" ON analysis_results
  FOR SELECT USING (public.is_admin());

-- usage_logs
DROP POLICY IF EXISTS "Admins can view all logs" ON usage_logs;
CREATE POLICY "usage_logs_admin_view" ON usage_logs
  FOR SELECT USING (public.is_admin());

-- keywords
DROP POLICY IF EXISTS "Admins can manage keywords" ON keywords;
CREATE POLICY "keywords_admin_manage" ON keywords
  FOR ALL USING (public.is_admin());

-- traffic_data
DROP POLICY IF EXISTS "Admins can manage traffic_data" ON traffic_data;
CREATE POLICY "traffic_data_admin_manage" ON traffic_data
  FOR ALL USING (public.is_admin());

-- media_documents
DROP POLICY IF EXISTS "media_documents_insert_policy" ON media_documents;
DROP POLICY IF EXISTS "media_documents_update_policy" ON media_documents;
DROP POLICY IF EXISTS "media_documents_delete_policy" ON media_documents;

CREATE POLICY "media_documents_insert_admin" ON media_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "media_documents_update_admin" ON media_documents
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "media_documents_delete_admin" ON media_documents
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- allowed_domains
DROP POLICY IF EXISTS "allowed_domains_select_admin" ON allowed_domains;
DROP POLICY IF EXISTS "allowed_domains_insert_admin" ON allowed_domains;
DROP POLICY IF EXISTS "allowed_domains_update_admin" ON allowed_domains;
DROP POLICY IF EXISTS "allowed_domains_delete_admin" ON allowed_domains;

CREATE POLICY "allowed_domains_select_admin" ON allowed_domains
  FOR SELECT USING (public.is_admin());

CREATE POLICY "allowed_domains_insert_admin" ON allowed_domains
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "allowed_domains_update_admin" ON allowed_domains
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "allowed_domains_delete_admin" ON allowed_domains
  FOR DELETE USING (public.is_admin());

-- 匿名ユーザーのドメイン検索用ポリシーは維持（既存）
-- CREATE POLICY "allowed_domains_anon_select" ON allowed_domains FOR SELECT USING (true);

-- ===========================================
-- 完了
-- ===========================================

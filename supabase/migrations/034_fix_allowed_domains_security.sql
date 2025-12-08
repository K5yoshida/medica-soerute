-- ===========================================
-- Migration: Fix allowed_domains Security
-- Date: 2024-12
-- Description:
--   allowed_domains テーブルのセキュリティ問題を修正
--   - 匿名ユーザーへの全データ公開ポリシーを削除
--   - handle_new_user関数はSECURITY DEFINERなのでRLSをバイパス可能
-- ===========================================

-- ===========================================
-- 1. 危険なポリシーを削除
-- ===========================================

-- このポリシーは誰でも（匿名を含む）allowed_domainsを読み取れてしまう
-- 法人顧客のドメイン一覧、組織名、プラン情報が漏洩するリスクがある
DROP POLICY IF EXISTS "allowed_domains_anon_select" ON allowed_domains;

-- ===========================================
-- 2. 説明
-- ===========================================
-- handle_new_user() 関数は SECURITY DEFINER で実行されるため、
-- allowed_domains テーブルへのアクセスにRLSポリシーは不要です。
--
-- 残るポリシー:
--   - allowed_domains_select_admin: 管理者のみ読み取り可能
--   - allowed_domains_insert_admin: 管理者のみ追加可能
--   - allowed_domains_update_admin: 管理者のみ更新可能
--   - allowed_domains_delete_admin: 管理者のみ削除可能
--
-- これにより、allowed_domains のデータは管理者以外には見えなくなり、
-- かつ新規ユーザー登録時のドメインチェックは正常に動作します。
-- ===========================================

-- ===========================================
-- 3. query_master / media_query_data の匿名アクセスを制限
-- ===========================================
-- これらのテーブルも認証ユーザーのみアクセス可能にする

-- query_master: 既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "query_master_select_all" ON query_master;

CREATE POLICY "query_master_select_authenticated" ON query_master
  FOR SELECT
  TO authenticated
  USING (true);

-- media_query_data: 既存ポリシーを削除して再作成
DROP POLICY IF EXISTS "media_query_data_select_all" ON media_query_data;

CREATE POLICY "media_query_data_select_authenticated" ON media_query_data
  FOR SELECT
  TO authenticated
  USING (true);

-- ===========================================
-- 完了
-- ===========================================

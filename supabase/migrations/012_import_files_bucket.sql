-- ===========================================
-- Migration: Import Files Storage Bucket
-- Date: 2024-12
-- Description:
--   CSVインポート用のストレージバケットを作成
--   import_jobs機能で使用するファイル一時保存用
-- ===========================================

-- ===========================================
-- 1. バケットの作成
-- ===========================================

-- import-filesバケットを作成（存在しない場合のみ）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'import-files',
  'import-files',
  false,  -- 非公開バケット
  52428800,  -- 50MB制限
  ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel', 'text/tab-separated-values']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ===========================================
-- 2. RLSポリシーの設定
-- ===========================================

-- 既存のポリシーを削除（冪等性のため）
DROP POLICY IF EXISTS "import_files_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "import_files_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "import_files_delete_admin" ON storage.objects;

-- 管理者のみアップロード可能
CREATE POLICY "import_files_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'import-files' AND public.is_admin()
  );

-- 管理者のみ読み取り可能
CREATE POLICY "import_files_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'import-files' AND public.is_admin()
  );

-- 管理者のみ削除可能
CREATE POLICY "import_files_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'import-files' AND public.is_admin()
  );

-- サービスロールからのアクセスを許可（Inngestジョブ用）
-- service_role keyは常にRLSをバイパスするため、追加ポリシー不要

-- ===========================================
-- 完了
-- ===========================================

-- 媒体資料テーブル
-- 媒体ごとの営業資料やドキュメントを管理

CREATE TABLE IF NOT EXISTS media_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_master(id) ON DELETE CASCADE,

  -- ファイル情報
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'image', 'pptx' など
  file_size INTEGER, -- バイト単位
  thumbnail_url TEXT, -- サムネイル画像URL（オプション）

  -- 表示順序
  display_order INTEGER DEFAULT 0,

  -- メタデータ
  uploaded_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_media_documents_media_id ON media_documents(media_id);
CREATE INDEX IF NOT EXISTS idx_media_documents_is_active ON media_documents(is_active);

-- RLSポリシー
ALTER TABLE media_documents ENABLE ROW LEVEL SECURITY;

-- 読み取り: 認証ユーザーは全てのアクティブな資料を閲覧可能
CREATE POLICY "media_documents_select_policy" ON media_documents
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 挿入・更新・削除: 管理者のみ
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

-- 更新時のタイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_media_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_media_documents_updated_at
  BEFORE UPDATE ON media_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_media_documents_updated_at();

-- コメント
COMMENT ON TABLE media_documents IS '媒体ごとの営業資料・ドキュメント';
COMMENT ON COLUMN media_documents.file_type IS 'pdf, image, pptx などのファイルタイプ';
COMMENT ON COLUMN media_documents.display_order IS '表示順序（小さい順）';

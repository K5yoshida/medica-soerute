-- ===========================================
-- media_masterにaliases（別名）カラムを追加
-- 指名検索判定で使用する媒体名の別名・略称を管理
-- ===========================================

-- aliasesカラムを追加（TEXT配列型）
-- 例: ジョブメドレー → ["jobmedley", "job-medley", "ジョブメド"]
ALTER TABLE media_master
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- 競合媒体テーブルを追加
-- 分析対象外だが指名検索判定には必要な媒体名を管理
CREATE TABLE IF NOT EXISTS competitor_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  aliases TEXT[] DEFAULT '{}',
  category media_category DEFAULT 'general',
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policy for competitor_media
ALTER TABLE competitor_media ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能
CREATE POLICY "Anyone can view competitor media"
  ON competitor_media FOR SELECT
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Admins can manage competitor media"
  ON competitor_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_atトリガー
CREATE TRIGGER update_competitor_media_updated_at
  BEFORE UPDATE ON competitor_media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データ: 主要な競合媒体を投入
-- ※これはハードコードではなく、DBで管理される形にすることで
--   将来的にUI経由で追加・編集可能になる
INSERT INTO competitor_media (name, aliases, category) VALUES
  -- 総合転職サイト
  ('マイナビ', ARRAY['マイナビ転職', 'マイナビエージェント', 'mynavi'], 'general'),
  ('リクナビ', ARRAY['リクナビnext', 'リクナビネクスト', 'リクルートエージェント', 'rikunabi'], 'general'),
  ('Indeed', ARRAY['インディード', 'indeed'], 'general'),
  ('エン転職', ARRAY['エン・ジャパン', 'en転職'], 'general'),
  ('doda', ARRAY['デューダ', 'パーソルキャリア'], 'general'),
  ('ビズリーチ', ARRAY['bizreach'], 'general'),
  ('Wantedly', ARRAY['ウォンテッドリー', 'wantedly'], 'general'),
  ('Green', ARRAY['グリーン', 'green'], 'general'),
  ('type転職', ARRAY['タイプ転職', '@type'], 'general'),
  -- 派遣・パート・アルバイト
  ('バイトル', ARRAY['baitoru'], 'general'),
  ('タウンワーク', ARRAY['townwork'], 'general'),
  -- 医療・介護・福祉系
  ('ナース人材バンク', ARRAY['ナース人材', 'nurse-bank'], 'nursing'),
  ('レバウェル看護', ARRAY['レバウェル', 'レバウェルナース', 'kango-oshigoto'], 'nursing'),
  ('ナースではたらこ', ARRAY['nurse-hatarako'], 'nursing'),
  ('マイナビ看護師', ARRAY['mynavi-kango'], 'nursing'),
  ('看護roo!', ARRAY['看護ルー', 'kango-roo', 'kangoroo'], 'nursing'),
  ('グッピー', ARRAY['guppy', 'GUPPY'], 'nursing'),
  ('コメディカルドットコム', ARRAY['comedical', 'コメディカル'], 'nursing'),
  ('e介護転職', ARRAY['e介護', 'e-kaigo'], 'welfare'),
  ('カイゴジョブ', ARRAY['kaigojob', 'kaigo-job'], 'welfare'),
  ('きらケア', ARRAY['きらケア介護', 'kiracare'], 'welfare'),
  ('かいご畑', ARRAY['kaigobatake'], 'welfare')
ON CONFLICT (name) DO UPDATE SET
  aliases = EXCLUDED.aliases,
  category = EXCLUDED.category,
  updated_at = NOW();

-- ジョブメドレーのaliasesを設定
UPDATE media_master
SET aliases = ARRAY['jobmedley', 'job-medley', 'ジョブメド', 'JOB MEDLEY']
WHERE name = 'ジョブメドレー';

-- コメント
COMMENT ON COLUMN media_master.aliases IS '媒体名の別名・略称（指名検索判定に使用）';
COMMENT ON TABLE competitor_media IS '競合媒体マスタ（分析対象外だが指名検索判定に必要）';

-- ===========================================
-- MEDICA SOERUTE - Add Catalog Tables
-- ===========================================
-- media_master テーブルを拡張し、keywords, traffic_data テーブルを追加

-- ===========================================
-- media_master テーブルの拡張
-- ===========================================

-- 新しいカラムを追加
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS monthly_visits BIGINT;
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS bounce_rate DECIMAL(5,2);
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS pages_per_visit DECIMAL(5,2);
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS avg_visit_duration INTEGER; -- 秒単位
ALTER TABLE media_master ADD COLUMN IF NOT EXISTS data_updated_at TIMESTAMPTZ;

-- ドメインにユニーク制約を追加（NULLは許容）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_media_master_domain ON media_master(domain) WHERE domain IS NOT NULL;

-- ===========================================
-- keywords テーブル
-- ===========================================

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media_master(id) ON DELETE CASCADE,
  keyword VARCHAR(500) NOT NULL,
  intent CHAR(1) CHECK (intent IN ('A', 'B', 'C')), -- A: 高い応募意図, B: 中程度, C: 情報収集
  seo_difficulty INTEGER CHECK (seo_difficulty >= 0 AND seo_difficulty <= 100),
  search_volume INTEGER,
  rank INTEGER CHECK (rank >= 1 AND rank <= 100),
  estimated_traffic INTEGER,
  cpc DECIMAL(10,2),
  competition INTEGER CHECK (competition >= 0 AND competition <= 100),
  url VARCHAR(2000),
  data_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_keywords_media_id ON keywords(media_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_intent ON keywords(intent);
CREATE INDEX IF NOT EXISTS idx_keywords_search_volume ON keywords(search_volume DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_keywords_rank ON keywords(rank);

-- RLS有効化
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能（ログインユーザー）
CREATE POLICY "Authenticated users can view keywords"
  ON keywords FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみ書き込み可能
CREATE POLICY "Admins can manage keywords"
  ON keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- updated_at トリガー
CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- traffic_data テーブル
-- ===========================================

CREATE TABLE IF NOT EXISTS traffic_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media_master(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- YYYY-MM形式
  search_pct DECIMAL(5,2) DEFAULT 0 CHECK (search_pct >= 0 AND search_pct <= 100),
  direct_pct DECIMAL(5,2) DEFAULT 0 CHECK (direct_pct >= 0 AND direct_pct <= 100),
  referral_pct DECIMAL(5,2) DEFAULT 0 CHECK (referral_pct >= 0 AND referral_pct <= 100),
  display_pct DECIMAL(5,2) DEFAULT 0 CHECK (display_pct >= 0 AND display_pct <= 100),
  email_pct DECIMAL(5,2) DEFAULT 0 CHECK (email_pct >= 0 AND email_pct <= 100),
  social_pct DECIMAL(5,2) DEFAULT 0 CHECK (social_pct >= 0 AND social_pct <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- media_id + period でユニーク
CREATE UNIQUE INDEX IF NOT EXISTS uniq_traffic_data_media_period ON traffic_data(media_id, period);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_traffic_data_media_id ON traffic_data(media_id);
CREATE INDEX IF NOT EXISTS idx_traffic_data_period ON traffic_data(period);

-- RLS有効化
ALTER TABLE traffic_data ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能（ログインユーザー）
CREATE POLICY "Authenticated users can view traffic_data"
  ON traffic_data FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみ書き込み可能
CREATE POLICY "Admins can manage traffic_data"
  ON traffic_data FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

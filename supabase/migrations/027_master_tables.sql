-- ===========================================
-- P3-3: マスターテーブル作成
-- 設計書: 12_DB一覧 - job_categories, industries, prefectures
-- ===========================================
-- 職種、業種、都道府県のマスターデータ
-- 検索条件の選択肢やデータ分類に使用

-- ===== 1. job_categories（職種マスター） =====
CREATE TABLE job_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 職種コード（ソート・識別用）
  code TEXT NOT NULL UNIQUE,
  -- 職種名
  name TEXT NOT NULL,
  -- 親カテゴリID（階層構造対応）
  parent_id UUID REFERENCES job_categories(id) ON DELETE SET NULL,
  -- カテゴリ（nursing, pharmacy, dental, welfare, rehabilitation, general）
  category media_category NOT NULL DEFAULT 'general',
  -- 表示順
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- 有効フラグ
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- メタデータ（求人数の目安、給与相場など）
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_job_categories_category ON job_categories(category);
CREATE INDEX idx_job_categories_parent ON job_categories(parent_id);
CREATE INDEX idx_job_categories_sort ON job_categories(sort_order);
CREATE INDEX idx_job_categories_active ON job_categories(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active job categories"
  ON job_categories FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage job categories"
  ON job_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'internal')));

-- 更新トリガー
CREATE TRIGGER update_job_categories_updated_at
  BEFORE UPDATE ON job_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE job_categories IS '職種マスター。医療・介護業界の職種分類。設計書: 12_DB一覧';

-- ===== 2. industries（業種マスター） =====
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 業種コード
  code TEXT NOT NULL UNIQUE,
  -- 業種名
  name TEXT NOT NULL,
  -- 親カテゴリID
  parent_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  -- 説明
  description TEXT,
  -- 表示順
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- 有効フラグ
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_industries_parent ON industries(parent_id);
CREATE INDEX idx_industries_sort ON industries(sort_order);
CREATE INDEX idx_industries_active ON industries(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active industries"
  ON industries FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage industries"
  ON industries FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'internal')));

-- 更新トリガー
CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE industries IS '業種マスター。医療・介護事業所の分類。設計書: 12_DB一覧';

-- ===== 3. prefectures（都道府県マスター） =====
CREATE TABLE prefectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 都道府県コード（JIS X 0401）
  code TEXT NOT NULL UNIQUE,
  -- 都道府県名
  name TEXT NOT NULL,
  -- ふりがな
  name_kana TEXT,
  -- 地方区分（hokkaido, tohoku, kanto, chubu, kinki, chugoku, shikoku, kyushu）
  region TEXT NOT NULL,
  -- 表示順
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- 有効フラグ
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- 市区町村数など追加情報
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス
CREATE INDEX idx_prefectures_region ON prefectures(region);
CREATE INDEX idx_prefectures_sort ON prefectures(sort_order);
CREATE INDEX idx_prefectures_active ON prefectures(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE prefectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active prefectures"
  ON prefectures FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins can manage prefectures"
  ON prefectures FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'internal')));

-- 更新トリガー
CREATE TRIGGER update_prefectures_updated_at
  BEFORE UPDATE ON prefectures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE prefectures IS '都道府県マスター。検索条件用。設計書: 12_DB一覧';

-- ===== 4. 初期データ投入 =====

-- 4.1 都道府県（47都道府県）
INSERT INTO prefectures (code, name, name_kana, region, sort_order) VALUES
('01', '北海道', 'ほっかいどう', 'hokkaido', 1),
('02', '青森県', 'あおもりけん', 'tohoku', 2),
('03', '岩手県', 'いわてけん', 'tohoku', 3),
('04', '宮城県', 'みやぎけん', 'tohoku', 4),
('05', '秋田県', 'あきたけん', 'tohoku', 5),
('06', '山形県', 'やまがたけん', 'tohoku', 6),
('07', '福島県', 'ふくしまけん', 'tohoku', 7),
('08', '茨城県', 'いばらきけん', 'kanto', 8),
('09', '栃木県', 'とちぎけん', 'kanto', 9),
('10', '群馬県', 'ぐんまけん', 'kanto', 10),
('11', '埼玉県', 'さいたまけん', 'kanto', 11),
('12', '千葉県', 'ちばけん', 'kanto', 12),
('13', '東京都', 'とうきょうと', 'kanto', 13),
('14', '神奈川県', 'かながわけん', 'kanto', 14),
('15', '新潟県', 'にいがたけん', 'chubu', 15),
('16', '富山県', 'とやまけん', 'chubu', 16),
('17', '石川県', 'いしかわけん', 'chubu', 17),
('18', '福井県', 'ふくいけん', 'chubu', 18),
('19', '山梨県', 'やまなしけん', 'chubu', 19),
('20', '長野県', 'ながのけん', 'chubu', 20),
('21', '岐阜県', 'ぎふけん', 'chubu', 21),
('22', '静岡県', 'しずおかけん', 'chubu', 22),
('23', '愛知県', 'あいちけん', 'chubu', 23),
('24', '三重県', 'みえけん', 'kinki', 24),
('25', '滋賀県', 'しがけん', 'kinki', 25),
('26', '京都府', 'きょうとふ', 'kinki', 26),
('27', '大阪府', 'おおさかふ', 'kinki', 27),
('28', '兵庫県', 'ひょうごけん', 'kinki', 28),
('29', '奈良県', 'ならけん', 'kinki', 29),
('30', '和歌山県', 'わかやまけん', 'kinki', 30),
('31', '鳥取県', 'とっとりけん', 'chugoku', 31),
('32', '島根県', 'しまねけん', 'chugoku', 32),
('33', '岡山県', 'おかやまけん', 'chugoku', 33),
('34', '広島県', 'ひろしまけん', 'chugoku', 34),
('35', '山口県', 'やまぐちけん', 'chugoku', 35),
('36', '徳島県', 'とくしまけん', 'shikoku', 36),
('37', '香川県', 'かがわけん', 'shikoku', 37),
('38', '愛媛県', 'えひめけん', 'shikoku', 38),
('39', '高知県', 'こうちけん', 'shikoku', 39),
('40', '福岡県', 'ふくおかけん', 'kyushu', 40),
('41', '佐賀県', 'さがけん', 'kyushu', 41),
('42', '長崎県', 'ながさきけん', 'kyushu', 42),
('43', '熊本県', 'くまもとけん', 'kyushu', 43),
('44', '大分県', 'おおいたけん', 'kyushu', 44),
('45', '宮崎県', 'みやざきけん', 'kyushu', 45),
('46', '鹿児島県', 'かごしまけん', 'kyushu', 46),
('47', '沖縄県', 'おきなわけん', 'kyushu', 47);

-- 4.2 職種カテゴリ（医療・介護メイン）
INSERT INTO job_categories (code, name, category, sort_order) VALUES
-- 介護系
('kaigo_helper', '介護職員・ヘルパー', 'welfare', 1),
('kaigo_manager', 'ケアマネジャー', 'welfare', 2),
('kaigo_seikatsu', '生活相談員', 'welfare', 3),
('kaigo_fukushi', '社会福祉士', 'welfare', 4),
('kaigo_seishin', '精神保健福祉士', 'welfare', 5),
('kaigo_kango', '看護師・准看護師（介護施設）', 'welfare', 6),
('kaigo_jimu', '介護事務', 'welfare', 7),
('kaigo_tyouri', '調理師・調理補助', 'welfare', 8),
('kaigo_souji', '清掃・施設管理', 'welfare', 9),
('kaigo_driver', '送迎ドライバー', 'welfare', 10),
-- 看護系
('kango_seikango', '正看護師', 'nursing', 11),
('kango_junkan', '准看護師', 'nursing', 12),
('kango_josanshi', '助産師', 'nursing', 13),
('kango_hokenshi', '保健師', 'nursing', 14),
-- リハビリ系
('rehab_pt', '理学療法士', 'rehabilitation', 15),
('rehab_ot', '作業療法士', 'rehabilitation', 16),
('rehab_st', '言語聴覚士', 'rehabilitation', 17),
-- 薬局系
('pharma_yakuzai', '薬剤師', 'pharmacy', 18),
('pharma_jimu', '調剤事務', 'pharmacy', 19),
('pharma_tourokuhan', '登録販売者', 'pharmacy', 20),
-- 歯科系
('dental_dentist', '歯科医師', 'dental', 21),
('dental_hygienist', '歯科衛生士', 'dental', 22),
('dental_technician', '歯科技工士', 'dental', 23),
('dental_assistant', '歯科助手', 'dental', 24),
-- 医療事務・一般
('imu_jimu', '医療事務', 'general', 25),
('imu_clerk', '医療クラーク', 'general', 26),
('imu_receptionist', '受付', 'general', 27);

-- 4.3 業種カテゴリ
INSERT INTO industries (code, name, description, sort_order) VALUES
-- 介護施設
('facility_tokuyou', '特別養護老人ホーム', '要介護3以上の高齢者を対象とした入所施設', 1),
('facility_roukensho', '介護老人保健施設', 'リハビリを行い在宅復帰を目指す入所施設', 2),
('facility_yuryou', '有料老人ホーム', '民間運営の高齢者向け居住施設', 3),
('facility_group', 'グループホーム', '認知症高齢者のための共同生活施設', 4),
('facility_service', 'サービス付き高齢者向け住宅', 'バリアフリー構造の賃貸住宅', 5),
-- 在宅サービス
('home_houmon', '訪問介護', '自宅での介護サービス提供', 6),
('home_houmonkango', '訪問看護', '自宅での看護サービス提供', 7),
('home_dayservice', 'デイサービス', '日帰りで介護サービスを提供', 8),
('home_daycare', 'デイケア', '日帰りでリハビリを提供', 9),
('home_shortStay', 'ショートステイ', '短期入所生活介護', 10),
-- 医療機関
('medical_hospital', '病院', '20床以上の入院施設を持つ医療機関', 11),
('medical_clinic', 'クリニック・診療所', '入院施設なしまたは19床以下', 12),
('medical_dental', '歯科医院', '歯科診療を行う医療機関', 13),
-- 薬局
('pharmacy_dispensing', '調剤薬局', '処方箋に基づき調剤を行う薬局', 14),
('pharmacy_drug', 'ドラッグストア', '医薬品・日用品の小売店', 15),
-- その他
('other_welfare', '障害者福祉施設', '障害者向け福祉サービス提供施設', 16),
('other_child', '児童福祉施設', '子ども向け福祉サービス提供施設', 17);

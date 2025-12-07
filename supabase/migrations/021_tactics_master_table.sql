-- ===========================================
-- 021: tactics_master テーブル
-- ===========================================
-- 設計書: 12_DB一覧 - tactics_master
-- Gap対応: GAP-021
--
-- PESO診断で使用する施策マスターテーブル
-- 各PESOカテゴリ（Paid/Earned/Shared/Owned）の施策と評価基準を管理

-- tactics_master テーブル作成
CREATE TABLE IF NOT EXISTS public.tactics_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('paid', 'earned', 'shared', 'owned')),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  evaluation_criteria JSONB DEFAULT '{}'::jsonb,
  recommended_for JSONB DEFAULT '[]'::jsonb, -- 推奨業種・規模
  implementation_difficulty TEXT CHECK (implementation_difficulty IN ('easy', 'medium', 'hard')),
  estimated_cost_range TEXT,
  expected_impact TEXT CHECK (expected_impact IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tactics_master_category ON public.tactics_master(category);
CREATE INDEX IF NOT EXISTS idx_tactics_master_active ON public.tactics_master(is_active);
CREATE INDEX IF NOT EXISTS idx_tactics_master_sort ON public.tactics_master(category, sort_order);

-- 更新時タイムスタンプ自動更新
CREATE OR REPLACE FUNCTION update_tactics_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tactics_master_updated_at
  BEFORE UPDATE ON public.tactics_master
  FOR EACH ROW
  EXECUTE FUNCTION update_tactics_master_updated_at();

-- RLSポリシー（読み取り専用で全ユーザーに公開）
ALTER TABLE public.tactics_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tactics_master_select_policy" ON public.tactics_master
  FOR SELECT
  USING (is_active = true);

-- 管理者のみ更新可能
CREATE POLICY "tactics_master_admin_all_policy" ON public.tactics_master
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'medica')
    )
  );

-- ===========================================
-- 初期データ投入
-- ===========================================

-- Paid（有料メディア）
INSERT INTO public.tactics_master (category, name, name_en, description, sort_order, implementation_difficulty, expected_impact, evaluation_criteria) VALUES
('paid', '求人広告（有料求人サイト）', 'job_ads', '医療・介護系求人サイトへの有料掲載', 1, 'easy', 'high', '{"metrics": ["掲載費用", "応募数", "採用単価"], "checkpoints": ["掲載媒体数", "予算配分", "効果測定"]}'),
('paid', 'リスティング広告', 'listing_ads', 'Google/Yahoo検索連動型広告', 2, 'medium', 'medium', '{"metrics": ["クリック率", "コンバージョン率", "CPA"], "checkpoints": ["キーワード設計", "LP最適化", "予算管理"]}'),
('paid', 'ディスプレイ広告', 'display_ads', 'バナー広告・リターゲティング広告', 3, 'medium', 'medium', '{"metrics": ["インプレッション", "CTR", "リーチ数"], "checkpoints": ["クリエイティブ", "ターゲティング", "フリークエンシー"]}'),
('paid', 'SNS広告', 'social_ads', 'Facebook/Instagram/X等の有料広告', 4, 'medium', 'medium', '{"metrics": ["エンゲージメント率", "リーチ数", "CPA"], "checkpoints": ["ターゲット設定", "クリエイティブ", "予算配分"]}'),
('paid', '人材紹介サービス', 'recruitment_agency', '人材紹介会社経由の採用', 5, 'easy', 'high', '{"metrics": ["紹介数", "採用率", "手数料率"], "checkpoints": ["エージェント選定", "要件共有", "連携体制"]}');

-- Earned（獲得メディア）
INSERT INTO public.tactics_master (category, name, name_en, description, sort_order, implementation_difficulty, expected_impact, evaluation_criteria) VALUES
('earned', 'プレスリリース', 'press_release', 'メディア向けプレスリリース配信', 1, 'medium', 'medium', '{"metrics": ["メディア掲載数", "PV数", "問い合わせ数"], "checkpoints": ["ニュース性", "配信タイミング", "メディアリスト"]}'),
('earned', 'メディア露出', 'media_coverage', 'TV・雑誌・Webメディアへの露出', 2, 'hard', 'high', '{"metrics": ["掲載メディア数", "リーチ数", "認知度変化"], "checkpoints": ["メディアリレーション", "話題性", "露出内容"]}'),
('earned', '口コミ・評判管理', 'review_management', '求人サイト・SNSでの口コミ対応', 3, 'medium', 'high', '{"metrics": ["評価スコア", "口コミ数", "返信率"], "checkpoints": ["モニタリング体制", "返信品質", "改善サイクル"]}'),
('earned', '業界団体・協会活動', 'industry_association', '業界団体での活動・発信', 4, 'medium', 'low', '{"metrics": ["参加イベント数", "登壇回数", "ネットワーク拡大"], "checkpoints": ["活動頻度", "発信内容", "関係構築"]}'),
('earned', '受賞・認定取得', 'awards_certifications', '働きやすさ認定等の取得', 5, 'hard', 'medium', '{"metrics": ["取得認定数", "認知度向上", "応募数変化"], "checkpoints": ["対象認定選定", "取得準備", "活用方法"]}');

-- Shared（共有メディア）
INSERT INTO public.tactics_master (category, name, name_en, description, sort_order, implementation_difficulty, expected_impact, evaluation_criteria) VALUES
('shared', 'SNS運用（Facebook/Instagram）', 'sns_facebook_instagram', '企業公式SNSアカウント運用', 1, 'medium', 'medium', '{"metrics": ["フォロワー数", "エンゲージメント率", "リーチ数"], "checkpoints": ["投稿頻度", "コンテンツ品質", "コミュニティ管理"]}'),
('shared', 'SNS運用（X/Twitter）', 'sns_twitter', 'X公式アカウント運用', 2, 'medium', 'medium', '{"metrics": ["フォロワー数", "RT/いいね数", "インプレッション"], "checkpoints": ["投稿頻度", "トレンド活用", "双方向コミュニケーション"]}'),
('shared', 'SNS運用（YouTube/TikTok）', 'sns_video', '動画SNSチャンネル運用', 3, 'hard', 'high', '{"metrics": ["チャンネル登録者", "再生回数", "視聴完了率"], "checkpoints": ["動画品質", "投稿頻度", "SEO対策"]}'),
('shared', 'LINE公式アカウント', 'line_official', 'LINE公式アカウント運用', 4, 'easy', 'medium', '{"metrics": ["友だち数", "開封率", "応募誘導数"], "checkpoints": ["配信頻度", "コンテンツ設計", "セグメント配信"]}'),
('shared', '社員紹介・アンバサダー', 'employee_ambassador', '社員による自発的な情報発信', 5, 'medium', 'high', '{"metrics": ["発信社員数", "リーチ数", "紹介応募数"], "checkpoints": ["参加促進施策", "ガイドライン", "インセンティブ"]}');

-- Owned（自社メディア）
INSERT INTO public.tactics_master (category, name, name_en, description, sort_order, implementation_difficulty, expected_impact, evaluation_criteria) VALUES
('owned', '採用サイト', 'career_site', '自社採用専用サイト運営', 1, 'medium', 'high', '{"metrics": ["PV数", "直帰率", "応募率"], "checkpoints": ["デザイン品質", "コンテンツ充実度", "UX最適化"]}'),
('owned', '採用ブログ・オウンドメディア', 'owned_media_blog', '採用に関するブログ・記事コンテンツ', 2, 'medium', 'medium', '{"metrics": ["PV数", "滞在時間", "CVR"], "checkpoints": ["更新頻度", "SEO対策", "コンテンツ品質"]}'),
('owned', '社員インタビュー', 'employee_interview', '現場社員のインタビューコンテンツ', 3, 'easy', 'high', '{"metrics": ["閲覧数", "シェア数", "応募動機言及率"], "checkpoints": ["掲載人数", "職種カバー率", "更新頻度"]}'),
('owned', '職場紹介動画', 'workplace_video', '職場環境・業務内容の動画コンテンツ', 4, 'medium', 'high', '{"metrics": ["再生回数", "視聴完了率", "応募影響度"], "checkpoints": ["動画品質", "情報網羅性", "更新頻度"]}'),
('owned', 'メールマガジン', 'email_newsletter', '求職者向けメールマガジン配信', 5, 'easy', 'medium', '{"metrics": ["開封率", "クリック率", "応募誘導数"], "checkpoints": ["配信頻度", "コンテンツ設計", "セグメント配信"]}'),
('owned', 'タレントプール', 'talent_pool', '過去応募者・接触者のDB管理', 6, 'medium', 'medium', '{"metrics": ["プール人数", "再応募率", "マッチング成功率"], "checkpoints": ["データ管理", "ナーチャリング", "アプローチ頻度"]}');

-- 確認用クエリ
-- SELECT category, COUNT(*) as count FROM public.tactics_master GROUP BY category ORDER BY category;

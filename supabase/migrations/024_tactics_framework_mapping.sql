-- ===========================================
-- 024: tactics_master 4フレームワークマッピング追加
-- ===========================================
-- 設計書: 02_市場分析と価値提案 - 4フレームワーク同時マッピング
-- Gap対応: GAP-011
--
-- 各施策を複数フレームワークにマッピング
-- - PESO: 既存のcategoryカラム
-- - ファネル: 認知 → 興味・関心 → 比較・検討 → 応募
-- - Conversion: Impression → PV → CV
-- - Journey: 検索 → 探索 → 保存 → 評価 → 応募

-- ファネルステージ（1=認知, 2=興味・関心, 3=比較・検討, 4=応募）
ALTER TABLE public.tactics_master
ADD COLUMN IF NOT EXISTS funnel_stages INTEGER[] DEFAULT '{}';

-- コンバージョンステージ（1=Impression, 2=PV, 3=CV）
ALTER TABLE public.tactics_master
ADD COLUMN IF NOT EXISTS conversion_stages INTEGER[] DEFAULT '{}';

-- ジャーニーステージ（1=検索, 2=探索, 3=保存, 4=評価, 5=応募）
ALTER TABLE public.tactics_master
ADD COLUMN IF NOT EXISTS journey_stages INTEGER[] DEFAULT '{}';

-- コメント追加
COMMENT ON COLUMN public.tactics_master.funnel_stages IS 'ファネルステージ: 1=認知, 2=興味・関心, 3=比較・検討, 4=応募';
COMMENT ON COLUMN public.tactics_master.conversion_stages IS 'コンバージョンステージ: 1=Impression, 2=PV, 3=CV';
COMMENT ON COLUMN public.tactics_master.journey_stages IS 'ジャーニーステージ: 1=検索, 2=探索, 3=保存, 4=評価, 5=応募';

-- ===========================================
-- 既存データにマッピング追加
-- ===========================================

-- Paid施策のマッピング
UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2],      -- 認知・興味
  conversion_stages = ARRAY[1],     -- Impression
  journey_stages = ARRAY[1, 2]      -- 検索・探索
WHERE name_en = 'job_ads';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2],
  conversion_stages = ARRAY[1, 2],  -- Impression・PV
  journey_stages = ARRAY[1, 2]
WHERE name_en = 'listing_ads';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1],         -- 認知のみ
  conversion_stages = ARRAY[1],
  journey_stages = ARRAY[1]
WHERE name_en = 'display_ads';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2],
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 2, 3]   -- 検索・探索・保存
WHERE name_en = 'social_ads';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[3, 4],      -- 比較検討・応募
  conversion_stages = ARRAY[2, 3],  -- PV・CV
  journey_stages = ARRAY[4, 5]      -- 評価・応募
WHERE name_en = 'recruitment_agency';

-- Earned施策のマッピング
UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1],
  conversion_stages = ARRAY[1],
  journey_stages = ARRAY[1]
WHERE name_en = 'press_release';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2],
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 2]
WHERE name_en = 'media_coverage';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[3, 4],      -- 比較検討・応募
  conversion_stages = ARRAY[2, 3],
  journey_stages = ARRAY[4, 5]      -- 評価・応募
WHERE name_en = 'review_management';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1],
  conversion_stages = ARRAY[1],
  journey_stages = ARRAY[1]
WHERE name_en = 'industry_association';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 3],      -- 認知・比較検討
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 4]      -- 検索・評価
WHERE name_en = 'awards_certifications';

-- Shared施策のマッピング
UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2, 3],   -- 認知・興味・比較
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 2, 3]   -- 検索・探索・保存
WHERE name_en = 'sns_facebook_instagram';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2],
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 2]
WHERE name_en = 'sns_twitter';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3],      -- 興味・比較
  conversion_stages = ARRAY[2],     -- PV
  journey_stages = ARRAY[2, 3, 4]   -- 探索・保存・評価
WHERE name_en = 'sns_video';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3, 4],   -- 興味・比較・応募
  conversion_stages = ARRAY[2, 3],
  journey_stages = ARRAY[3, 4, 5]   -- 保存・評価・応募
WHERE name_en = 'line_official';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[1, 2, 3],
  conversion_stages = ARRAY[1, 2],
  journey_stages = ARRAY[1, 2, 4]
WHERE name_en = 'employee_ambassador';

-- Owned施策のマッピング
UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3, 4],   -- 興味・比較・応募
  conversion_stages = ARRAY[2, 3],
  journey_stages = ARRAY[2, 3, 4, 5]
WHERE name_en = 'career_site';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3],
  conversion_stages = ARRAY[2],
  journey_stages = ARRAY[2, 3, 4]
WHERE name_en = 'owned_media_blog';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3],
  conversion_stages = ARRAY[2],
  journey_stages = ARRAY[2, 4]      -- 探索・評価
WHERE name_en = 'employee_interview';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[2, 3],
  conversion_stages = ARRAY[2],
  journey_stages = ARRAY[2, 4]
WHERE name_en = 'workplace_video';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[3, 4],      -- 比較・応募
  conversion_stages = ARRAY[2, 3],
  journey_stages = ARRAY[3, 4, 5]   -- 保存・評価・応募
WHERE name_en = 'email_newsletter';

UPDATE public.tactics_master SET
  funnel_stages = ARRAY[3, 4],
  conversion_stages = ARRAY[2, 3],
  journey_stages = ARRAY[4, 5]      -- 評価・応募
WHERE name_en = 'talent_pool';

-- インデックス追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_tactics_funnel ON public.tactics_master USING GIN (funnel_stages);
CREATE INDEX IF NOT EXISTS idx_tactics_conversion ON public.tactics_master USING GIN (conversion_stages);
CREATE INDEX IF NOT EXISTS idx_tactics_journey ON public.tactics_master USING GIN (journey_stages);

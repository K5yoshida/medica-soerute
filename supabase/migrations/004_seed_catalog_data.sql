-- ===========================================
-- MEDICA SOERUTE - Seed Catalog Data
-- ===========================================
-- media_master のドメイン・トラフィック情報と、keywords, traffic_data のサンプルデータ

-- ===========================================
-- media_master のドメイン・月間訪問数を更新
-- ===========================================

UPDATE media_master SET
  domain = 'nursejinzaibank.com',
  monthly_visits = 2500000,
  bounce_rate = 42.5,
  pages_per_visit = 4.2,
  avg_visit_duration = 185,
  data_updated_at = NOW()
WHERE name = 'ナース人材バンク';

UPDATE media_master SET
  domain = 'mynavi-nurse.jp',
  monthly_visits = 1800000,
  bounce_rate = 38.2,
  pages_per_visit = 5.1,
  avg_visit_duration = 210,
  data_updated_at = NOW()
WHERE name = 'マイナビ看護師';

UPDATE media_master SET
  domain = 'kango-roo.com',
  monthly_visits = 3200000,
  bounce_rate = 35.8,
  pages_per_visit = 6.3,
  avg_visit_duration = 245,
  data_updated_at = NOW()
WHERE name = '看護roo!';

UPDATE media_master SET
  domain = 'nurse-hatarakuko.net',
  monthly_visits = 950000,
  bounce_rate = 45.1,
  pages_per_visit = 3.8,
  avg_visit_duration = 156,
  data_updated_at = NOW()
WHERE name = 'ナースではたらこ';

UPDATE media_master SET
  domain = 'kaigojob.com',
  monthly_visits = 1200000,
  bounce_rate = 40.3,
  pages_per_visit = 4.5,
  avg_visit_duration = 178,
  data_updated_at = NOW()
WHERE name = 'カイゴジョブ';

UPDATE media_master SET
  domain = 'kiracare.jp',
  monthly_visits = 850000,
  bounce_rate = 36.7,
  pages_per_visit = 5.2,
  avg_visit_duration = 195,
  data_updated_at = NOW()
WHERE name = 'きらケア';

UPDATE media_master SET
  domain = 'mynavi-kaigoshoku.jp',
  monthly_visits = 720000,
  bounce_rate = 39.5,
  pages_per_visit = 4.8,
  avg_visit_duration = 188,
  data_updated_at = NOW()
WHERE name = 'マイナビ介護職';

UPDATE media_master SET
  domain = 'mynavi-yakuzaishi.jp',
  monthly_visits = 580000,
  bounce_rate = 34.2,
  pages_per_visit = 5.5,
  avg_visit_duration = 225,
  data_updated_at = NOW()
WHERE name = 'マイナビ薬剤師';

UPDATE media_master SET
  domain = 'pharmastaff.jp',
  monthly_visits = 420000,
  bounce_rate = 37.8,
  pages_per_visit = 4.9,
  avg_visit_duration = 198,
  data_updated_at = NOW()
WHERE name = 'ファルマスタッフ';

UPDATE media_master SET
  domain = 'yakucare.jp',
  monthly_visits = 680000,
  bounce_rate = 33.5,
  pages_per_visit = 5.8,
  avg_visit_duration = 232,
  data_updated_at = NOW()
WHERE name = '薬キャリ';

UPDATE media_master SET
  domain = 'firstnavi-dental.jp',
  monthly_visits = 320000,
  bounce_rate = 41.2,
  pages_per_visit = 4.3,
  avg_visit_duration = 165,
  data_updated_at = NOW()
WHERE name = 'ファーストナビ歯科';

UPDATE media_master SET
  domain = 'dental-worker.com',
  monthly_visits = 280000,
  bounce_rate = 38.9,
  pages_per_visit = 4.6,
  avg_visit_duration = 172,
  data_updated_at = NOW()
WHERE name = 'デンタルワーカー';

UPDATE media_master SET
  domain = 'ptotst-worker.com',
  monthly_visits = 450000,
  bounce_rate = 35.6,
  pages_per_visit = 5.1,
  avg_visit_duration = 195,
  data_updated_at = NOW()
WHERE name = 'PTOTSTワーカー';

UPDATE media_master SET
  domain = 'mynavi-comedical.jp',
  monthly_visits = 380000,
  bounce_rate = 37.3,
  pages_per_visit = 4.7,
  avg_visit_duration = 182,
  data_updated_at = NOW()
WHERE name = 'マイナビコメディカル';

UPDATE media_master SET
  domain = 'indeed.com',
  monthly_visits = 45000000,
  bounce_rate = 52.3,
  pages_per_visit = 2.8,
  avg_visit_duration = 95,
  data_updated_at = NOW()
WHERE name = 'Indeed';

UPDATE media_master SET
  domain = 'jobmedley.com',
  monthly_visits = 2800000,
  bounce_rate = 38.5,
  pages_per_visit = 5.2,
  avg_visit_duration = 205,
  data_updated_at = NOW()
WHERE name = 'ジョブメドレー';

UPDATE media_master SET
  domain = 'guppy.jp',
  monthly_visits = 850000,
  bounce_rate = 42.8,
  pages_per_visit = 4.1,
  avg_visit_duration = 162,
  data_updated_at = NOW()
WHERE name = 'グッピー';

UPDATE media_master SET
  domain = 'comedical.com',
  monthly_visits = 420000,
  bounce_rate = 40.5,
  pages_per_visit = 4.4,
  avg_visit_duration = 175,
  data_updated_at = NOW()
WHERE name = 'コメディカルドットコム';

-- ===========================================
-- keywords サンプルデータ
-- ===========================================

-- ナース人材バンクのキーワード
INSERT INTO keywords (media_id, keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
SELECT
  m.id,
  kw.keyword,
  kw.intent,
  kw.seo_difficulty,
  kw.search_volume,
  kw.rank,
  kw.estimated_traffic,
  kw.cpc,
  kw.competition
FROM media_master m
CROSS JOIN (
  VALUES
    ('看護師 転職', 'A', 75, 40500, 2, 8500, 2.50, 85),
    ('看護師 求人', 'A', 72, 33100, 3, 5200, 2.30, 82),
    ('看護師 転職サイト おすすめ', 'A', 68, 8100, 1, 4800, 3.20, 78),
    ('看護師 給料', 'B', 45, 22200, 5, 2100, 1.50, 55),
    ('看護師 辞めたい', 'B', 38, 14800, 8, 890, 1.20, 42),
    ('准看護師 求人', 'A', 55, 6600, 4, 1250, 1.80, 65),
    ('訪問看護師 転職', 'A', 52, 3300, 2, 1100, 2.10, 58),
    ('看護師 夜勤なし', 'B', 48, 5400, 6, 680, 1.65, 52),
    ('クリニック 看護師 求人', 'A', 58, 4400, 3, 920, 1.95, 62),
    ('看護師 面接 対策', 'C', 35, 2900, 7, 280, 0.85, 35)
) AS kw(keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
WHERE m.name = 'ナース人材バンク';

-- マイナビ看護師のキーワード
INSERT INTO keywords (media_id, keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
SELECT
  m.id,
  kw.keyword,
  kw.intent,
  kw.seo_difficulty,
  kw.search_volume,
  kw.rank,
  kw.estimated_traffic,
  kw.cpc,
  kw.competition
FROM media_master m
CROSS JOIN (
  VALUES
    ('マイナビ 看護師', 'A', 25, 18100, 1, 12500, 1.80, 35),
    ('看護師 転職 マイナビ', 'A', 32, 4400, 1, 3200, 2.10, 42),
    ('看護師 転職', 'A', 75, 40500, 4, 4200, 2.50, 85),
    ('看護師 求人 東京', 'A', 65, 9900, 5, 1250, 2.40, 72),
    ('看護師 年収', 'B', 42, 12100, 6, 1100, 1.35, 48),
    ('看護師 転職 失敗', 'B', 38, 3600, 3, 680, 1.15, 40),
    ('美容クリニック 看護師', 'A', 58, 5400, 4, 720, 2.25, 65),
    ('看護師 求人 神奈川', 'A', 55, 4400, 6, 520, 2.15, 60),
    ('看護師 履歴書 書き方', 'C', 30, 6600, 5, 580, 0.75, 32),
    ('看護師 志望動機', 'C', 28, 8100, 4, 720, 0.65, 28)
) AS kw(keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
WHERE m.name = 'マイナビ看護師';

-- 看護roo!のキーワード
INSERT INTO keywords (media_id, keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
SELECT
  m.id,
  kw.keyword,
  kw.intent,
  kw.seo_difficulty,
  kw.search_volume,
  kw.rank,
  kw.estimated_traffic,
  kw.cpc,
  kw.competition
FROM media_master m
CROSS JOIN (
  VALUES
    ('看護roo', 'A', 15, 27100, 1, 22000, 1.50, 25),
    ('カンゴルー', 'A', 12, 14800, 1, 12500, 1.20, 20),
    ('看護師 転職', 'A', 75, 40500, 5, 3800, 2.50, 85),
    ('看護師 国試 過去問', 'C', 35, 22200, 1, 15800, 0.45, 38),
    ('看護師 掲示板', 'C', 28, 8100, 1, 6200, 0.35, 25),
    ('看護学生 勉強', 'C', 32, 5400, 2, 2100, 0.55, 30),
    ('新人看護師 悩み', 'B', 25, 3300, 1, 2800, 0.75, 28),
    ('看護師 あるある', 'C', 18, 6600, 1, 5200, 0.25, 15),
    ('看護師 転職 口コミ', 'A', 45, 4400, 2, 1650, 1.85, 52),
    ('看護師 求人 クリニック', 'A', 55, 3300, 4, 620, 2.05, 58)
) AS kw(keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
WHERE m.name = '看護roo!';

-- カイゴジョブのキーワード
INSERT INTO keywords (media_id, keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
SELECT
  m.id,
  kw.keyword,
  kw.intent,
  kw.seo_difficulty,
  kw.search_volume,
  kw.rank,
  kw.estimated_traffic,
  kw.cpc,
  kw.competition
FROM media_master m
CROSS JOIN (
  VALUES
    ('介護職 求人', 'A', 68, 27100, 2, 5800, 1.95, 75),
    ('介護福祉士 転職', 'A', 62, 9900, 3, 2100, 2.15, 68),
    ('カイゴジョブ', 'A', 18, 12100, 1, 9500, 1.25, 22),
    ('介護 未経験 求人', 'A', 55, 6600, 4, 980, 1.75, 58),
    ('介護士 給料', 'B', 40, 8100, 6, 720, 1.15, 45),
    ('ヘルパー 求人', 'A', 52, 5400, 5, 650, 1.65, 55),
    ('デイサービス 求人', 'A', 48, 4400, 3, 850, 1.55, 52),
    ('介護施設 求人', 'A', 58, 3300, 4, 580, 1.85, 62),
    ('介護職 辞めたい', 'B', 32, 4400, 7, 320, 0.85, 35),
    ('介護福祉士 資格', 'C', 35, 5400, 8, 280, 0.55, 32)
) AS kw(keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
WHERE m.name = 'カイゴジョブ';

-- ジョブメドレーのキーワード
INSERT INTO keywords (media_id, keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
SELECT
  m.id,
  kw.keyword,
  kw.intent,
  kw.seo_difficulty,
  kw.search_volume,
  kw.rank,
  kw.estimated_traffic,
  kw.cpc,
  kw.competition
FROM media_master m
CROSS JOIN (
  VALUES
    ('ジョブメドレー', 'A', 15, 33100, 1, 28000, 1.35, 20),
    ('医療事務 求人', 'A', 62, 14800, 3, 3200, 1.85, 68),
    ('看護師 求人', 'A', 72, 33100, 6, 2800, 2.30, 82),
    ('介護職 求人', 'A', 68, 27100, 4, 3500, 1.95, 75),
    ('歯科衛生士 求人', 'A', 55, 9900, 2, 2850, 2.05, 60),
    ('理学療法士 求人', 'A', 52, 8100, 3, 1650, 1.95, 58),
    ('作業療法士 求人', 'A', 48, 5400, 4, 820, 1.85, 52),
    ('薬剤師 求人', 'A', 65, 12100, 5, 1250, 2.45, 72),
    ('保育士 求人', 'A', 58, 18100, 4, 2100, 1.75, 62),
    ('医療 転職', 'B', 55, 6600, 6, 680, 1.55, 58)
) AS kw(keyword, intent, seo_difficulty, search_volume, rank, estimated_traffic, cpc, competition)
WHERE m.name = 'ジョブメドレー';

-- ===========================================
-- traffic_data サンプルデータ
-- ===========================================

-- ナース人材バンク
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 62.5, 18.2, 8.5, 6.3, 2.8, 1.7),
    ('2024-10', 64.2, 17.5, 8.1, 5.8, 2.6, 1.8),
    ('2024-11', 63.8, 17.8, 8.3, 5.9, 2.5, 1.7)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = 'ナース人材バンク';

-- マイナビ看護師
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 58.3, 22.5, 9.2, 5.5, 2.8, 1.7),
    ('2024-10', 59.1, 21.8, 9.5, 5.2, 2.6, 1.8),
    ('2024-11', 58.8, 22.1, 9.3, 5.4, 2.7, 1.7)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = 'マイナビ看護師';

-- 看護roo!
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 68.5, 15.2, 6.8, 4.2, 2.5, 2.8),
    ('2024-10', 69.2, 14.8, 6.5, 4.0, 2.3, 3.2),
    ('2024-11', 68.8, 15.0, 6.6, 4.1, 2.4, 3.1)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = '看護roo!';

-- カイゴジョブ
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 55.8, 20.5, 12.2, 7.5, 2.2, 1.8),
    ('2024-10', 56.5, 19.8, 12.5, 7.2, 2.3, 1.7),
    ('2024-11', 56.2, 20.1, 12.3, 7.4, 2.2, 1.8)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = 'カイゴジョブ';

-- ジョブメドレー
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 65.2, 18.8, 7.5, 4.8, 2.2, 1.5),
    ('2024-10', 66.1, 18.2, 7.2, 4.5, 2.3, 1.7),
    ('2024-11', 65.8, 18.5, 7.3, 4.6, 2.2, 1.6)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = 'ジョブメドレー';

-- Indeed
INSERT INTO traffic_data (media_id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
SELECT m.id, period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct
FROM media_master m
CROSS JOIN (
  VALUES
    ('2024-09', 72.5, 15.8, 5.2, 3.5, 1.8, 1.2),
    ('2024-10', 73.2, 15.2, 5.0, 3.3, 1.9, 1.4),
    ('2024-11', 72.8, 15.5, 5.1, 3.4, 1.8, 1.4)
) AS td(period, search_pct, direct_pct, referral_pct, display_pct, email_pct, social_pct)
WHERE m.name = 'Indeed';

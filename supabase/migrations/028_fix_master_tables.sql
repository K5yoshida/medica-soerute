-- ===========================================
-- P3-3修正: マスターテーブル修正
-- - industriesテーブル削除（不要）
-- - job_categoriesを汎用職種に変更
-- ===========================================

-- ===== 1. industriesテーブル削除 =====
DROP TABLE IF EXISTS industries CASCADE;

-- ===== 2. job_categoriesのデータを汎用職種に入れ替え =====
-- 既存データ削除
DELETE FROM job_categories;

-- 汎用職種マスター投入（全業界対応）
INSERT INTO job_categories (code, name, category, sort_order) VALUES
-- 営業・販売系
('sales_general', '営業', 'general', 1),
('sales_inside', 'インサイドセールス', 'general', 2),
('sales_field', 'フィールドセールス', 'general', 3),
('sales_retail', '販売・接客', 'general', 4),
('sales_store', '店長・店舗管理', 'general', 5),

-- 事務・管理系
('office_general', '一般事務', 'general', 10),
('office_accounting', '経理・財務', 'general', 11),
('office_hr', '人事・労務', 'general', 12),
('office_legal', '法務', 'general', 13),
('office_admin', '総務', 'general', 14),
('office_secretary', '秘書・受付', 'general', 15),

-- 企画・マーケティング系
('planning_marketing', 'マーケティング', 'general', 20),
('planning_pr', '広報・PR', 'general', 21),
('planning_product', '商品企画', 'general', 22),
('planning_business', '事業企画', 'general', 23),

-- IT・エンジニア系
('it_engineer', 'システムエンジニア', 'general', 30),
('it_programmer', 'プログラマー', 'general', 31),
('it_web', 'Webエンジニア', 'general', 32),
('it_infra', 'インフラエンジニア', 'general', 33),
('it_pm', 'プロジェクトマネージャー', 'general', 34),
('it_support', 'ITサポート・ヘルプデスク', 'general', 35),

-- クリエイティブ系
('creative_designer', 'デザイナー', 'general', 40),
('creative_web', 'Webデザイナー', 'general', 41),
('creative_writer', 'ライター・編集', 'general', 42),
('creative_video', '映像制作', 'general', 43),

-- 製造・物流系
('manufacturing_operator', '製造オペレーター', 'general', 50),
('manufacturing_quality', '品質管理', 'general', 51),
('manufacturing_maintenance', '設備保全', 'general', 52),
('logistics_warehouse', '倉庫管理', 'general', 53),
('logistics_driver', 'ドライバー', 'general', 54),

-- 専門職系
('professional_consultant', 'コンサルタント', 'general', 60),
('professional_researcher', '研究開発', 'general', 61),
('professional_analyst', 'データアナリスト', 'general', 62),

-- 医療・介護系
('medical_nurse', '看護師', 'nursing', 70),
('medical_care', '介護職', 'welfare', 71),
('medical_pharmacist', '薬剤師', 'pharmacy', 72),
('medical_therapist', 'リハビリ職', 'rehabilitation', 73),
('medical_dental', '歯科関連', 'dental', 74),
('medical_office', '医療事務', 'general', 75),

-- サービス・その他
('service_food', '飲食・フード', 'general', 80),
('service_hotel', 'ホテル・旅館', 'general', 81),
('service_beauty', '美容・エステ', 'general', 82),
('service_education', '教育・講師', 'general', 83),
('service_customer', 'カスタマーサポート', 'general', 84),
('other_general', 'その他', 'general', 99);

-- コメント更新
COMMENT ON TABLE job_categories IS '職種マスター。全業界対応の汎用職種分類。設計書: 12_DB一覧';

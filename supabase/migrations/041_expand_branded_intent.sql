-- ===========================================
-- Migration: Expand Branded Intent to 3 Categories (Part 1)
-- Date: 2025-12
-- Description:
--   指名検索（branded）を3つのサブカテゴリに拡張
--   - branded_media: 指名検索（媒体）- 競合媒体への流出
--   - branded_customer: 指名検索（顧客）- 採用活動中の施設
--   - branded_ambiguous: 指名検索（曖昧）- 特定できない指名検索
--
--   注意: PostgreSQLでは同じトランザクション内で新しいENUM値を
--   追加して使用することができないため、2つのマイグレーションに分割
-- ===========================================

-- ===========================================
-- Step 1: 新しいENUM値を追加
-- ===========================================

-- 3つの新しい指名検索カテゴリを追加
ALTER TYPE query_intent ADD VALUE IF NOT EXISTS 'branded_media';
ALTER TYPE query_intent ADD VALUE IF NOT EXISTS 'branded_customer';
ALTER TYPE query_intent ADD VALUE IF NOT EXISTS 'branded_ambiguous';

-- ===========================================
-- 完了（データマイグレーションは042で実行）
-- ===========================================

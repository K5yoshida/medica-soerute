-- ===========================================
-- Migration: Add B2B Intent to query_intent ENUM
-- Date: 2024-12
-- Description:
--   query_intent ENUMに b2b（法人向け）を追加
--   採用担当者・人事が検索するキーワードを分類するため
-- ===========================================

-- PostgreSQLでENUMに値を追加
ALTER TYPE query_intent ADD VALUE IF NOT EXISTS 'b2b';

-- ===========================================
-- 完了
-- ===========================================

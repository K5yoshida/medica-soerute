-- ===========================================
-- Migration: Remove commercial intent category
-- Date: 2024-12
-- Description:
--   意図分類を4カテゴリに変更:
--   - branded: 指名検索
--   - transactional: 応募意図
--   - informational: 情報収集（旧commercial含む）
--   - b2b: 法人向け
--
--   commercial → informational に統合
-- ===========================================

-- 1. 既存のcommercialデータをinformationalに更新
UPDATE keywords
SET
  intent = 'informational',
  intent_reason = COALESCE(intent_reason, '') || '（比較検討から統合）',
  intent_updated_at = NOW()
WHERE intent = 'commercial';

-- 2. PostgreSQLではENUMの値を直接削除できないため、
--    新しいENUM型を作成して置き換える方法を使用
--    ただし、参照しているカラムがある場合は制約を一時的に変更する必要がある

-- 注: PostgreSQLでは既存ENUMから値を削除するのは複雑なため、
--     アプリケーション側で'commercial'を使わないようにし、
--     既存データは上記UPDATEで移行済み
--     ENUMの値自体は残るが、アプリケーションからは使用されない

-- ===========================================
-- 完了
-- ===========================================

-- 017: PESO診断の使用回数を個別管理するためのカラム追加
--
-- 背景:
-- - 設計書では Starter プラン: マッチング 20回/月、PESO 10回/月と異なる制限
-- - API コストも異なる (マッチング: $0.10-0.30, PESO: $0.05)
-- - ユーザージャーニーも異なる (マッチング: クライアント提案、PESO: 自己診断)
-- - 将来のプラン設計の柔軟性を確保するため、カウンターを分離

-- PESO診断の使用回数カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_peso_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_peso_limit INTEGER DEFAULT 10;

-- 既存カラムの名前を明確化（マッチング分析用であることを明示）
-- ※既存のmonthly_analysis_countはマッチング用として継続使用
COMMENT ON COLUMN users.monthly_analysis_count IS 'マッチング分析の月間使用回数';
COMMENT ON COLUMN users.monthly_analysis_limit IS 'マッチング分析の月間使用上限';
COMMENT ON COLUMN users.monthly_peso_count IS 'PESO診断の月間使用回数';
COMMENT ON COLUMN users.monthly_peso_limit IS 'PESO診断の月間使用上限';

-- get_plan_limit関数を更新してPESO制限も返すように拡張
CREATE OR REPLACE FUNCTION get_plan_limits(plan_type plan_type)
RETURNS TABLE (matching_limit INTEGER, peso_limit INTEGER) AS $$
BEGIN
  CASE plan_type
    WHEN 'medica' THEN
      RETURN QUERY SELECT 999999, 999999;  -- 社内利用は無制限
    WHEN 'enterprise' THEN
      RETURN QUERY SELECT 100, 50;  -- エンタープライズ
    WHEN 'professional' THEN
      RETURN QUERY SELECT 50, 30;   -- プロフェッショナル
    WHEN 'starter' THEN
      RETURN QUERY SELECT 20, 10;   -- スターター（設計書準拠）
    WHEN 'trial' THEN
      RETURN QUERY SELECT 5, 3;     -- トライアル
    ELSE
      RETURN QUERY SELECT 20, 10;   -- デフォルト
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 月次リセット関数を更新してPESOカウントもリセット
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    monthly_analysis_count = 0,
    monthly_peso_count = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

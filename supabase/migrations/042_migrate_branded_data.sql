-- ===========================================
-- Migration: Expand Branded Intent to 3 Categories (Part 2)
-- Date: 2025-12
-- Description:
--   041で追加した新しいENUM値を使用してデータをマイグレーション
--   既存の branded データは branded_ambiguous に移行
-- ===========================================

-- ===========================================
-- Step 1: 既存データのマイグレーション
-- ===========================================

-- 既存の branded を branded_ambiguous に変換
UPDATE keywords
SET
  intent = 'branded_ambiguous',
  intent_reason = COALESCE(intent_reason, '') || ' [旧branded→要再分類]',
  updated_at = NOW()
WHERE intent = 'branded';

-- ===========================================
-- Step 2: upsert_keyword関数の更新
-- ===========================================

-- 関数を更新して新しいintent値をサポート
CREATE OR REPLACE FUNCTION upsert_keyword(
  p_keyword TEXT,
  p_intent query_intent DEFAULT 'unknown',
  p_intent_confidence VARCHAR(10) DEFAULT 'low',
  p_intent_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_normalized TEXT;
  v_id UUID;
BEGIN
  v_normalized := normalize_keyword(p_keyword);

  INSERT INTO keywords (keyword, keyword_normalized, intent, intent_confidence, intent_reason, intent_updated_at)
  VALUES (p_keyword, v_normalized, p_intent, p_intent_confidence, p_intent_reason, NOW())
  ON CONFLICT (keyword_normalized) DO UPDATE SET
    intent = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent
      ELSE keywords.intent
    END,
    intent_confidence = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent_confidence
      ELSE keywords.intent_confidence
    END,
    intent_reason = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN EXCLUDED.intent_reason
      ELSE keywords.intent_reason
    END,
    intent_updated_at = CASE
      WHEN EXCLUDED.intent_confidence = 'high' AND keywords.intent_confidence != 'high'
      THEN NOW()
      ELSE keywords.intent_updated_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Step 3: コメント更新
-- ===========================================

COMMENT ON COLUMN keywords.intent IS '意図分類: branded_media(媒体指名), branded_customer(顧客指名), branded_ambiguous(曖昧指名), transactional(応募意図), informational(情報収集), b2b(法人向け), unknown(未分類)';

-- ===========================================
-- 完了
-- ===========================================

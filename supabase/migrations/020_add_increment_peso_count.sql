-- 020: PESO診断回数インクリメント関数
-- 設計書: GAP-010 PESO回数制限の分離
--
-- マッチング分析とは別にPESO診断の回数を管理するためのRPC関数

-- PESO診断回数をインクリメントする関数
CREATE OR REPLACE FUNCTION increment_peso_count(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT monthly_peso_count, monthly_peso_limit
  INTO v_count, v_limit
  FROM users
  WHERE id = p_user_id;

  -- Check if limit is unlimited (-1) or not reached
  IF v_limit = -1 OR v_count < v_limit THEN
    UPDATE users
    SET monthly_peso_count = monthly_peso_count + 1
    WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION increment_peso_count IS 'PESO診断回数をインクリメントし、上限チェックを行う。上限到達時はFALSEを返す。';

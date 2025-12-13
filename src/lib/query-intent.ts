// ===========================================
// Query Intent Classification
// クエリ（検索キーワード）の意図を分類するロジック
//
// 設計原則（v2 - 2024-12-14更新）:
// 1. 3層ハイブリッド分類: ルールベース → AI判定 → Web検索（最小限）
// 2. ルールは500件SERP検証に基づく高精度パターン
// 3. 媒体名リストは事前定義（「求人ボックス」対策）
// 4. Web検索はbranded_ambiguousのみ（コスト最小化）
// 5. 70-80%をルールで処理、残りをAI、Web検索は5%未満
// ===========================================

import Anthropic from '@anthropic-ai/sdk'

/**
 * クエリ意図の種類（6カテゴリ）
 *
 * 指名検索（3分類）:
 * - branded_media: 指名検索（媒体）- 競合媒体への流出（ジョブメドレー、マイナビ看護師など）
 * - branded_customer: 指名検索（顧客）- 採用活動中の施設（聖路加国際病院、〇〇クリニックなど）
 * - branded_ambiguous: 指名検索（曖昧）- 特定できない指名検索（れいんぼー、charomなど）
 *
 * その他:
 * - transactional: 応募意図（求人・転職など応募意図が明確）
 * - informational: 情報収集（知識・ハウツー・一般情報・条件比較含む）
 * - b2b: 法人向け（採用担当者・人事向けの情報）
 */
export type QueryIntent =
  | 'branded_media'
  | 'branded_customer'
  | 'branded_ambiguous'
  | 'transactional'
  | 'informational'
  | 'b2b'

/**
 * 指名検索かどうかを判定するヘルパー
 */
export function isBrandedIntent(intent: QueryIntent): boolean {
  return intent === 'branded_media' || intent === 'branded_customer' || intent === 'branded_ambiguous'
}

/**
 * SEO標準のクエリタイプ（Do/Know/Go/Buy）
 */
export type QueryType = 'Do' | 'Know' | 'Go' | 'Buy'

/**
 * 意図分類の結果
 */
export interface IntentClassification {
  intent: QueryIntent
  confidence: 'high' | 'medium' | 'low'
  reason: string
  queryType?: QueryType
  serpVerified?: boolean  // SERP検証済みフラグ
}

/**
 * ルールベース分類の結果（AI判定が必要かどうかを含む）
 */
interface RuleBasedResult {
  classification: IntentClassification | null  // nullならAI判定が必要
  needsAI: boolean
}

// ===========================================
// ルールベース判定用の定数定義
// プロンプト08（500件SERP検証済み）に基づく
// ===========================================

/**
 * 求人媒体ブランドリスト（branded_media判定用）
 * 重要: transactionalパターンより先にチェック（「求人ボックス」対策）
 */
const JOB_MEDIA_BRANDS = [
  // 総合求人
  'indeed', 'リクナビ', 'マイナビ', 'doda', 'エン転職', 'タウンワーク', 'バイトル',
  '求人ボックス', 'スタンバイ', 'イーアイデム', 'type', 'ビズリーチ',
  // スキマバイト
  'タイミー', 'シェアフル',
  // 主婦向け
  'しゅふjob', '主婦job',
  // 医療介護総合
  'ジョブメドレー', 'コメディカルドットコム', 'グッピー', 'カルケル',
  // 介護
  'レバウェル介護', 'きらケア', 'カイゴジョブ', 'かいご畑', 'ケア人材バンク',
  '介護ワーカー', 'マイナビ介護職', 'e介護転職',
  // 看護
  'マイナビ看護師', '看護roo', 'ナース人材バンク', '医療ワーカー', '看護師ワーカー',
  // リハビリ
  'ptot人材バンク', 'ptotstワーカー',
  // 歯科
  'デンタルワーカー', 'ファーストナビ歯科',
  // 保育
  '保育士バンク', 'ほいく畑', '保育ひろば', 'ヒトシア保育',
  // 薬剤師
  'ファルマスタッフ', 'マイナビ薬剤師', 'リクナビ薬剤師', '薬キャリ',
  // 公共
  'ハローワーク',
  // 飲食特化
  '茶ぼなび', 'みんジョブ',
]

/**
 * B2Bパターン（採用担当者・経営者向け）
 */
const B2B_PATTERNS = [
  '処遇改善加算', '介護報酬', '診療報酬', '加算', '改定',
  '人員配置基準', '配置基準',
  '採用単価', '採用コスト', '人材紹介手数料', '紹介料',
  '開業', '開業資金', '開業費用', '経営', '独立',
  'm&a', '事業承継', '売却',
  '有効求人倍率', '人手不足対策',
]

/**
 * 書類・面接関連パターン（informational優先）
 * transactionalパターンより先にチェック
 */
const DOCUMENT_INTERVIEW_PATTERNS = [
  '履歴書', '職務経歴書', '志望動機', '自己pr', '自己ＰＲ',
  '書き方', '例文', 'テンプレート',
  '本人希望欄', '記入欄', '本人希望記入欄',
]

/**
 * 面接関連組み合わせパターン
 */
const INTERVIEW_COMBO_SUFFIXES = [
  '質問', '対策', '準備', '聞かれる', '答え方',
]

/**
 * 転職ノウハウパターン（「転職」を含んでいてもinformational）
 * 例: 50代からの転職、30歳からの転職
 */
const TENSHOKU_KNOWHOW_REGEX = /\d+[代歳才]からの(転職|仕事)/

/**
 * 「〜とは」パターン（定義・概念説明 → informational）
 */
const TOHA_PATTERN_REGEX = /とは$/

/**
 * Transactionalパターン（求人応募意図）
 */
const TRANSACTIONAL_PATTERNS = [
  '求人', '募集', '転職', '採用', '正社員', '契約社員', '派遣',
  'バイト', 'アルバイト', 'パート', '内職', '在宅ワーク',
  '仕事探し', 'お仕事探し', '就職',
  // ひらがな
  'きゅうじん', 'ぼしゅう', 'てんしょく', 'さいよう',
]

/**
 * 雇用形態パターン（地名との組み合わせ用）
 */
const EMPLOYMENT_TYPE_PATTERNS = [
  'パート', 'バイト', 'アルバイト', '正社員', '派遣', '契約社員',
]

/**
 * 都道府県試験型職種（地名+職種でinformational）
 * 注意: 「ケアマネージャー」（長音あり）は除外
 * マッチ順序を考慮し、短い「ケアマネ」は「ケアマネージャー」の後にチェックする必要あり
 */
const EXAM_INFORMATIONAL_JOBS_SHORT = [
  '登録販売者',
]
const EXAM_INFORMATIONAL_JOB_CAREMANE = 'ケアマネ' // 「ケアマネージャー」を除外するため別途処理

/**
 * 一般的な職種名（地名+職種でtransactional）
 */
const GENERAL_JOB_TITLES = [
  '看護師', '保育士', '歯科衛生士', '理学療法士', '言語聴覚士',
  '介護福祉士', '管理栄養士', '介護士', '介護職', '薬剤師',
  '作業療法士', '医療事務', 'ナース', 'ケアマネージャー',
  '栄養士', '社会福祉士', '歯科助手', '調理師', '調剤事務',
]

/**
 * Informationalパターン（情報収集）
 */
const INFORMATIONAL_PATTERNS = [
  '年収', '給料', '給与', '月収', '時給', '相場', '手取り', 'ボーナス', '賞与',
  '仕事内容', '業務内容', '役割', '一日の流れ',
  '資格', '試験', '難易度', '合格率', '勉強法', '過去問', '受験資格',
  'なるには', 'なり方', 'キャリア', '将来性', '需要',
  '違い', '比較', 'メリット', 'デメリット',
  'きつい', '辛い', '辞めたい', '大変', 'やりがい', '向いている人',
  'ブランク', '復帰', '復職', '未経験',
  '離職率', '退職理由', '辞める',
  'おすすめ', 'ランキング',
  '研修', '実習', '奨学金',
]

/**
 * 日本の都道府県名
 */
const PREFECTURES = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野',
  '岐阜', '静岡', '愛知', '三重',
  '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
  '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知',
  '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄',
]

/**
 * 主要都市名（市区町村）
 */
const MAJOR_CITIES = [
  '札幌', '仙台', 'さいたま', '横浜', '川崎', '相模原',
  '新潟', '静岡', '浜松', '名古屋', '京都', '大阪', '堺',
  '神戸', '岡山', '広島', '北九州', '福岡', '熊本',
  // 東京23区
  '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区',
  '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区',
  '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区', '足立区',
  '葛飾区', '江戸川区',
]

/**
 * ルールベース分類（v2 - プロンプト08準拠）
 *
 * 判定順序（優先度順）:
 * 1. 空文字チェック
 * 2. B2B判定
 * 3. 媒体名判定（branded_media）※「求人」より先にチェック
 * 4. 書類・面接関連（informational優先）
 * 5. 転職ノウハウパターン（informational）
 * 6. 「〜とは」パターン（informational）
 * 7. Transactionalパターン
 * 8. 地名 + 雇用形態 → transactional
 * 9. 地名 + 職種名 → transactional（例外: 都道府県試験型）
 * 10. Informationalパターン
 * 11. 判定不可 → AI判定へ
 */
function classifyByRule(keyword: string): RuleBasedResult {
  const k = keyword.toLowerCase().trim()
  const original = keyword.trim()

  // ===========================================
  // Step 0: 空文字チェック
  // ===========================================
  if (!k) {
    return {
      classification: { intent: 'informational', confidence: 'low', reason: '空のキーワード' },
      needsAI: false,
    }
  }

  // ===========================================
  // Step 1: B2B判定（採用担当者・経営者向け）
  // ===========================================
  for (const pattern of B2B_PATTERNS) {
    if (k.includes(pattern.toLowerCase())) {
      return {
        classification: {
          intent: 'b2b',
          confidence: 'high',
          reason: `事業者向け「${pattern}」`,
          queryType: 'Know',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 2: 求人媒体名判定（branded_media）
  // 重要: transactionalパターンより先にチェック（「求人ボックス」対策）
  // ===========================================
  for (const media of JOB_MEDIA_BRANDS) {
    const mediaLower = media.toLowerCase()
    if (k.includes(mediaLower)) {
      // 媒体名を除去した残りの部分でtransactionalパターンをチェック
      // これにより「求人ボックス」の「求人」部分が誤マッチするのを防ぐ
      const keywordWithoutMedia = k.replace(mediaLower, '').trim()

      // 媒体名以外の部分にtransactionalパターンがあるか
      let hasAdditionalTransactional = false
      for (const pattern of TRANSACTIONAL_PATTERNS) {
        if (keywordWithoutMedia.includes(pattern.toLowerCase())) {
          hasAdditionalTransactional = true
          break
        }
      }

      if (hasAdditionalTransactional) {
        // 媒体名 + 追加のtransactionalパターン → transactional
        return {
          classification: {
            intent: 'transactional',
            confidence: 'high',
            reason: `媒体「${media}」+求人系KW`,
            queryType: 'Do',
          },
          needsAI: false,
        }
      }

      // 媒体名のみ → branded_media
      return {
        classification: {
          intent: 'branded_media',
          confidence: 'high',
          reason: `求人媒体「${media}」`,
          queryType: 'Go',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 3: 書類・面接関連チェック（informational優先）
  // transactionalパターンより先にチェック
  // ===========================================
  for (const pattern of DOCUMENT_INTERVIEW_PATTERNS) {
    if (k.includes(pattern.toLowerCase())) {
      return {
        classification: {
          intent: 'informational',
          confidence: 'high',
          reason: `書類関連「${pattern}」`,
          queryType: 'Know',
        },
        needsAI: false,
      }
    }
  }

  // 面接 + 質問/対策などの組み合わせチェック
  if (k.includes('面接')) {
    for (const suffix of INTERVIEW_COMBO_SUFFIXES) {
      if (k.includes(suffix.toLowerCase())) {
        return {
          classification: {
            intent: 'informational',
            confidence: 'high',
            reason: `面接対策「面接+${suffix}」`,
            queryType: 'Know',
          },
          needsAI: false,
        }
      }
    }
  }

  // ===========================================
  // Step 4: 転職ノウハウパターン（「転職」を含んでいてもinformational）
  // 例: 50代からの転職、40歳からの仕事
  // ===========================================
  if (TENSHOKU_KNOWHOW_REGEX.test(original)) {
    // ただし「仕事探し」が含まれる場合はtransactional
    if (!k.includes('仕事探し') && !k.includes('お仕事探し')) {
      return {
        classification: {
          intent: 'informational',
          confidence: 'high',
          reason: '転職ノウハウ系',
          queryType: 'Know',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 5: 「〜とは」パターン（定義・概念説明）
  // ===========================================
  if (TOHA_PATTERN_REGEX.test(original)) {
    return {
      classification: {
        intent: 'informational',
        confidence: 'high',
        reason: '「〜とは」定義説明',
        queryType: 'Know',
      },
      needsAI: false,
    }
  }

  // ===========================================
  // Step 6: Transactionalパターン（求人応募意図）
  // ===========================================
  for (const pattern of TRANSACTIONAL_PATTERNS) {
    if (k.includes(pattern.toLowerCase())) {
      return {
        classification: {
          intent: 'transactional',
          confidence: 'high',
          reason: `求人KW「${pattern}」`,
          queryType: 'Do',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 7: 地名 + 雇用形態 → transactional
  // ===========================================
  const hasLocation = containsLocation(k)
  if (hasLocation) {
    for (const empType of EMPLOYMENT_TYPE_PATTERNS) {
      if (k.includes(empType.toLowerCase())) {
        return {
          classification: {
            intent: 'transactional',
            confidence: 'high',
            reason: `地名+雇用形態「${empType}」`,
            queryType: 'Do',
          },
          needsAI: false,
        }
      }
    }

    // ===========================================
    // Step 8: 地名 + 職種名
    // ===========================================
    // 一般職種 → transactional（先にチェック）
    // 「ケアマネージャー」は「ケアマネ」より先にマッチさせるため、一般職種を先にチェック
    for (const job of GENERAL_JOB_TITLES) {
      if (k.includes(job.toLowerCase())) {
        return {
          classification: {
            intent: 'transactional',
            confidence: 'high',
            reason: `地名+職種「${job}」`,
            queryType: 'Do',
          },
          needsAI: false,
        }
      }
    }

    // 都道府県試験型 → informational
    for (const job of EXAM_INFORMATIONAL_JOBS_SHORT) {
      if (k.includes(job.toLowerCase())) {
        return {
          classification: {
            intent: 'informational',
            confidence: 'high',
            reason: `都道府県試験型「${job}」`,
            queryType: 'Know',
          },
          needsAI: false,
        }
      }
    }

    // ケアマネ（短縮形）のみinformational
    // 注意: 「ケアマネージャー」は上の一般職種で先にマッチ済み
    if (k.includes(EXAM_INFORMATIONAL_JOB_CAREMANE.toLowerCase()) && !k.includes('ケアマネージャー')) {
      return {
        classification: {
          intent: 'informational',
          confidence: 'high',
          reason: '都道府県試験型「ケアマネ」',
          queryType: 'Know',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 9: Informationalパターン（情報収集）
  // ===========================================
  for (const pattern of INFORMATIONAL_PATTERNS) {
    if (k.includes(pattern.toLowerCase())) {
      return {
        classification: {
          intent: 'informational',
          confidence: 'high',
          reason: `情報収集「${pattern}」`,
          queryType: 'Know',
        },
        needsAI: false,
      }
    }
  }

  // ===========================================
  // Step 10: 判定不可 → AI判定へ
  // ===========================================
  return {
    classification: null,
    needsAI: true,
  }
}

/**
 * 地名を含むかチェック
 */
function containsLocation(keyword: string): boolean {
  const k = keyword.toLowerCase()

  // 都道府県チェック
  for (const pref of PREFECTURES) {
    if (k.includes(pref.toLowerCase())) {
      return true
    }
  }

  // 主要都市チェック
  for (const city of MAJOR_CITIES) {
    if (k.includes(city.toLowerCase())) {
      return true
    }
  }

  // 「〜市」「〜区」「〜町」「〜村」パターン
  if (/[市区町村]/.test(keyword)) {
    return true
  }

  return false
}

/**
 * クエリ意図を分類する（同期版・ルールベースのみ）
 * AI判定が必要な場合はinformationalをデフォルトで返す
 *
 * バッチ処理ではclassifyWithHybrid()を使用すること
 */
export function classifyQueryIntent(keyword: string): IntentClassification {
  const result = classifyByRule(keyword)

  if (result.classification) {
    return result.classification
  }

  // AI判定が必要だがここでは呼べない → デフォルト返却
  return {
    intent: 'informational',
    confidence: 'low',
    reason: 'AI判定が必要',
  }
}

/**
 * バッチ処理用：複数キーワードを一括分類（ルールのみ）
 */
export function classifyQueryIntents(keywords: string[]): Map<string, IntentClassification> {
  const results = new Map<string, IntentClassification>()
  for (const keyword of keywords) {
    results.set(keyword, classifyQueryIntent(keyword))
  }
  return results
}

/**
 * 意図別のラベル（日本語表示用）
 */
export const INTENT_LABELS: Record<QueryIntent, string> = {
  branded_media: '指名検索（媒体）',
  branded_customer: '指名検索（顧客）',
  branded_ambiguous: '指名検索（曖昧）',
  transactional: '応募意図',
  informational: '情報収集',
  b2b: '法人向け',
}

/**
 * 意図別の説明
 */
export const INTENT_DESCRIPTIONS: Record<QueryIntent, string> = {
  branded_media: '競合媒体への流出（ジョブメドレー、マイナビ看護師など）',
  branded_customer: '採用活動中の施設を検索（病院、クリニックなど）',
  branded_ambiguous: '何かを探しているが特定できない指名検索',
  transactional: '求人への応募意欲が高い状態',
  informational: '一般的な情報や知識を求めている（条件比較含む）',
  b2b: '採用担当者・人事が検索している',
}

/**
 * 意図別の色（UI表示用）
 */
export const INTENT_COLORS: Record<QueryIntent, { color: string; bgColor: string }> = {
  branded_media: { color: '#7C3AED', bgColor: '#EDE9FE' },      // 紫（媒体）
  branded_customer: { color: '#DB2777', bgColor: '#FCE7F3' },   // ピンク（顧客）
  branded_ambiguous: { color: '#9333EA', bgColor: '#F3E8FF' },  // 薄紫（曖昧）
  transactional: { color: '#E11D48', bgColor: '#FFE4E6' },      // 赤
  informational: { color: '#0284C7', bgColor: '#E0F2FE' },      // 青
  b2b: { color: '#059669', bgColor: '#D1FAE5' },                // 緑
}

/**
 * クエリタイプのラベル（日本語表示用）
 */
export const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  Do: 'Do',
  Know: 'Know',
  Go: 'Go',
  Buy: 'Buy',
}

/**
 * クエリタイプの説明
 */
export const QUERY_TYPE_DESCRIPTIONS: Record<QueryType, string> = {
  Do: '行動したい（応募・登録）',
  Know: '知りたい（情報収集）',
  Go: '特定サイトへ行きたい',
  Buy: '購入/比較検討したい',
}

/**
 * SEOクエリタイプを分類する
 */
export function classifyQueryType(keyword: string): QueryType {
  const k = keyword.toLowerCase().trim()

  if (!k) {
    return 'Know'
  }

  // ログイン、マイページなど明確な移動意図
  if (/ログイン|マイページ|会員登録|公式/.test(k)) {
    return 'Go'
  }

  // 行動系キーワード
  if (/応募|登録|申し込み|申込|エントリー|面接|履歴書|職務経歴書/.test(k)) {
    return 'Do'
  }

  // 「〜したい」パターン
  if (/したい|しよう|始める|なりたい|なる方法/.test(k)) {
    return 'Do'
  }

  // 比較・選定キーワード
  if (/おすすめ|オススメ|ランキング|比較|vs|選び方|選ぶ|人気|評判|口コミ|レビュー/.test(k)) {
    return 'Buy'
  }

  // 「どこがいい」「どれがいい」パターン
  if (/どこがいい|どれがいい|どっちが|ベスト|トップ/.test(k)) {
    return 'Buy'
  }

  // 明確な情報収集キーワード
  if (/とは|意味|方法|やり方|仕方|違い|メリット|デメリット/.test(k)) {
    return 'Know'
  }

  // 疑問系
  if (/\?|？|なぜ|なに|どう|いくら|何歳|何年/.test(k)) {
    return 'Know'
  }

  // 年収、給料、条件などの情報系
  if (/年収|給料|給与|月給|時給|平均|相場|資格|条件|休日|残業|夜勤/.test(k)) {
    return 'Know'
  }

  // デフォルトはKnow（情報収集）
  return 'Know'
}

/**
 * バッチ処理用：複数キーワードのクエリタイプを一括分類
 */
export function classifyQueryTypes(keywords: string[]): Map<string, QueryType> {
  const results = new Map<string, QueryType>()
  for (const keyword of keywords) {
    results.set(keyword, classifyQueryType(keyword))
  }
  return results
}

/**
 * intentからqueryTypeを導出
 *
 * マッピング:
 * - branded_* → Go（特定サイトへの訪問意図）
 * - transactional → Do（応募行動意図）
 * - informational/b2b → Know（情報収集意図）
 */
export function getQueryTypeFromIntent(intent: QueryIntent): QueryType {
  switch (intent) {
    case 'branded_media':
    case 'branded_customer':
    case 'branded_ambiguous':
      return 'Go'
    case 'transactional':
      return 'Do'
    case 'informational':
    case 'b2b':
      return 'Know'
    default:
      // 型安全のためのフォールバック（実際には到達しない）
      return 'Know'
  }
}

// ===========================================
// Claude API + Web検索を使った分類
// ===========================================

// 遅延初期化（テスト環境でのエラー回避）
let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

/**
 * Claude APIをWeb検索付きで呼び出してキーワードを分類する
 *
 * 処理フロー:
 * 1. キーワードをGoogleで検索（Web検索ツール使用）
 * 2. SERPの上位結果を確認
 * 3. 特定のサービス/企業の公式サイトが上位を占めているか確認
 * 4. 占めていればbranded、それ以外は内容に応じて分類
 *
 * これにより「グリーン歯科」vs「グリーン（転職サイト）」の判別が可能
 */
export async function classifyWithWebSearch(
  keywords: string[],
  batchSize: number = 10  // 小バッチでWeb検索の確実性を高める
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  // バッチに分割
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize))
  }

  // 順次処理（Web検索のレート制限を考慮）
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    console.log(`[classifyWithWebSearch] Batch ${i + 1}/${batches.length}: ${batch.length}件`)

    const batchResults = await classifyBatchWithWebSearch(batch)

    batchResults.forEach((classification, keyword) => {
      results.set(keyword, classification)
    })

    // レート制限対策: バッチ間で少し待機
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * バッチ単位でClaude API + Web検索を呼び出す
 */
async function classifyBatchWithWebSearch(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')

  const systemPrompt = `あなたは検索クエリを分析する専門家です。

## 【最重要】Web検索の必須使用
**必ずWeb検索ツールを使って実際のGoogle検索結果（SERP）を確認してから分類してください。**
- 推測や知識だけで分類しないでください
- 各キーワードについて、実際にWeb検索を実行し、上位の検索結果を確認してください
- Web検索なしの分類は許可されていません

## 分類カテゴリ（6種類）

### 指名検索（3種類）
特定のブランド・組織を探している検索。SERPで判断する。
**重要**: 「求人」「転職」「募集」「採用」が含まれる場合は指名検索にはならない（transactionalになる）

#### 1. branded_media（指名検索・媒体）
**求人媒体・転職サイト**を直接検索している。
- 「Indeed」「リクナビ」「マイナビ」「doda」「エン転職」など
- SERPに求人媒体の公式サイトが上位を占める
- 注意: 「Indeed 求人」はtransactional、「Indeed」単体がbranded_media

#### 2. branded_customer（指名検索・顧客）
**求人媒体以外の企業・施設・店舗・組織名**を単体で検索している（求人・採用なし）。
- あらゆる業種: 病院、水族館、サロン、飲食店、メーカー、IT企業、小売店など
- 「トヨタ」「墨田水族館」「スターバックス」「〇〇病院」など
- SERPに特定の組織の公式サイトが上位を占める
- 注意: 「トヨタ 求人」はtransactional、「トヨタ」単体がbranded_customer

#### 3. branded_ambiguous（指名検索・曖昧）
**固有名詞だが、SERPで複数の異なるブランド/組織が並ぶ**ケース。
- 「れいんぼー」「charom」「ABC」など、同名の別組織が複数存在
- SERPに同名の複数施設・サービスが並び、ユーザーが何を探しているか特定できない
- 1つの組織/サービスに特定できればbranded_mediaかbranded_customer

### その他（3種類）

#### 4. transactional（応募意図）
求人への応募・転職意図が明確。
- 「〇〇 求人」「〇〇 転職」「〇〇 募集」「〇〇 採用」
- 応募行動に直結するキーワード

#### 5. informational（情報収集）
一般的な情報・知識・ハウツー・条件比較を求めている。
- 職種の説明、条件・待遇、ハウツー、比較・おすすめ
- 一般的な職種名単体（「エンジニア」「営業」「事務」など）
- SERPに多様なサイトが並ぶ（特定サービスが独占していない）

#### 6. b2b（法人向け）
採用担当者・人事が検索するキーワード。
- 採用コスト・費用、採用管理・システム、人材紹介手数料、ATS

## 判定フロー

1. SERPの上位が特定サービス/組織で独占されているか？
   - NO → informational or transactional or b2b
   - YES → 指名検索（次へ）

2. 指名検索の場合、何を探している？
   - 求人媒体・転職サイト → branded_media
   - 求人媒体以外の企業・施設・店舗・組織 → branded_customer
   - 複数の異なる組織が同名で存在 or 判断できない → branded_ambiguous

## 出力形式

必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード1", "intent": "branded_media|branded_customer|branded_ambiguous|transactional|informational|b2b", "reason": "分類理由（30文字以内）"},
  ...
]`

  const userPrompt = `以下の${keywords.length}件のキーワードを分類してください。

【重要】必ずWeb検索ツールを使用して、各キーワードの実際のGoogle検索結果を確認してから分類してください。推測で分類しないでください。

キーワード:
${keywordList}

手順:
1. 上記のキーワードをWeb検索ツールで検索する
2. SERPの上位結果を確認する
3. 結果に基づいて分類する

JSON配列のみを返してください。`

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 30,  // 十分な検索枠を確保
      }],
    })

    // レスポンスからテキストを取得
    // Web検索ツールを使用した場合、contentは複数のブロックになる可能性がある
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text
      }
    }

    // JSONをパース
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[classifyBatchWithWebSearch] JSON not found in response:', responseText.slice(0, 500))
      throw new Error('JSON not found in response')
    }

    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      keyword: string
      intent: string
      reason: string
    }>

    const validIntents: QueryIntent[] = [
      'branded_media', 'branded_customer', 'branded_ambiguous',
      'transactional', 'informational', 'b2b'
    ]
    for (const item of classifications) {
      const intent = item.intent as QueryIntent
      if (validIntents.includes(intent)) {
        results.set(item.keyword, {
          intent,
          confidence: 'high',
          reason: `[SERP] ${item.reason}`,  // Web検索でSERP確認済みであることを明示
          queryType: getQueryTypeFromIntent(intent),  // intentからqueryTypeを導出
          serpVerified: true,
        })
      }
    }

    // 分類されなかったキーワードにデフォルト値を設定
    for (const keyword of keywords) {
      if (!results.has(keyword)) {
        results.set(keyword, {
          intent: 'informational',
          confidence: 'low',
          reason: 'AI分類失敗',
          queryType: 'Know',  // informationalのデフォルト
          serpVerified: false,
        })
      }
    }

    // 使用状況をログ & 実際にWeb検索が使われたかチェック
    let actualWebSearchCount = 0
    if (response.usage) {
      const serverToolUse = (response.usage as { server_tool_use?: { web_search_requests?: number } }).server_tool_use
      actualWebSearchCount = serverToolUse?.web_search_requests || 0
      console.log(`[classifyBatchWithWebSearch] Web検索回数: ${actualWebSearchCount}`)
    }

    // Web検索が1回も使われなかった場合、serpVerifiedをfalseに修正
    if (actualWebSearchCount === 0) {
      console.warn('[classifyBatchWithWebSearch] Web検索が使われませんでした。serpVerifiedをfalseに修正します。')
      results.forEach((classification, keyword) => {
        results.set(keyword, {
          ...classification,
          serpVerified: false,
          reason: classification.reason.replace('[SERP]', '[AI分類]'),
        })
      })
    }

  } catch (error) {
    // エラー詳細を取得（完全なエラー情報をログ）
    let errorDetail = ''
    if (error instanceof Anthropic.APIError) {
      const fullError = JSON.stringify(error.error)
      errorDetail = `${error.status}: ${fullError}`
      console.error('[classifyBatchWithWebSearch] API Error FULL:', {
        status: error.status,
        message: error.message,
        headers: error.headers,
        errorFull: fullError,
      })
    } else {
      errorDetail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      console.error('[classifyBatchWithWebSearch] Error:', errorDetail)
    }

    // Web検索エラー時はWeb検索なしのAI分類にフォールバック
    console.log('[classifyBatchWithWebSearch] Falling back to classifyWithClaude without web search')
    try {
      const fallbackResults = await classifyBatchWithClaude(keywords)
      fallbackResults.forEach((classification, keyword) => {
        results.set(keyword, {
          ...classification,
          serpVerified: false,
          reason: `[AI分類] ${classification.reason}`,  // Web検索なしのAI分類であることを明示
        })
      })
    } catch (fallbackError) {
      // フォールバックエラー詳細（完全なエラー情報をログ）
      let fallbackErrorDetail = ''
      if (fallbackError instanceof Anthropic.APIError) {
        const fullError = JSON.stringify(fallbackError.error)
        fallbackErrorDetail = `${fallbackError.status}: ${fullError}`
        console.error('[classifyBatchWithWebSearch] Fallback API Error FULL:', {
          status: fallbackError.status,
          message: fallbackError.message,
          headers: fallbackError.headers,
          errorFull: fullError,
        })
      } else {
        fallbackErrorDetail = fallbackError instanceof Error ? `${fallbackError.name}: ${fallbackError.message}` : String(fallbackError)
      }
      console.error('[classifyBatchWithWebSearch] Fallback also failed:', fallbackErrorDetail)

      // フォールバックも失敗した場合はinformationalに（エラー詳細を含める）
      // reasonに完全なエラー情報を保存（デバッグ用）
      const combinedError = `[エラー] ${fallbackErrorDetail.slice(0, 100)}`
      for (const keyword of keywords) {
        results.set(keyword, {
          intent: 'informational',
          confidence: 'low',
          reason: combinedError,
          serpVerified: false,
        })
      }
    }
  }

  return results
}

/**
 * Web検索なしのClaude API呼び出し（コスト節約用）
 * ルールで確定できないがWeb検索までは不要な場合に使用
 */
export async function classifyWithClaude(
  keywords: string[],
  batchSize: number = 100
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  // バッチに分割
  const batches: string[][] = []
  for (let i = 0; i < keywords.length; i += batchSize) {
    batches.push(keywords.slice(i, i + batchSize))
  }

  // 最大3バッチを並列で処理
  const PARALLEL_LIMIT = 3
  for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
    const parallelBatches = batches.slice(i, i + PARALLEL_LIMIT)
    const batchPromises = parallelBatches.map(batch => classifyBatchWithClaude(batch))
    const batchResultsArray = await Promise.all(batchPromises)

    for (const batchResults of batchResultsArray) {
      batchResults.forEach((classification, keyword) => {
        results.set(keyword, classification)
      })
    }
  }

  return results
}

/**
 * バッチ単位でClaude APIを呼び出す（Web検索なし）
 * Layer 2: AI判定（ルールで判定できなかったキーワード用）
 */
async function classifyBatchWithClaude(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()

  if (keywords.length === 0) return results

  const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')

  const systemPrompt = `あなたは医療・介護・福祉業界の求人検索キーワードを分析する専門家です。

このキーワードはルールベース判定で分類できなかったものです。以下の6カテゴリに分類してください。

## 分類カテゴリ（6種類）

### 1. transactional（応募意図）
求人への応募・転職意図が明確。求人サイトがSERPを支配するキーワード。
- 「求人」「転職」「募集」「採用」「バイト」「パート」等を含む
- 地名+職種の組み合わせ（例: 福岡 看護師）
- **注意**: 固有名詞+求人系ワード → transactional（例: ○○病院 求人）

### 2. informational（情報収集）
一般的な情報・知識・ハウツーを求めている。
- 年収、仕事内容、資格、なるには、比較、きつい等
- 純粋な職種名単体（例: 「看護師」だけ）
- 書類・面接関連（履歴書、志望動機、面接対策等）

### 3. branded_media（指名検索：求人媒体）
求人媒体・転職サイトへの訪問意図。
- Indeed、リクナビ、マイナビ、doda等の媒体名を**単体で**検索
- 媒体名+評判/口コミ/ログイン等

### 4. branded_customer（指名検索：施設・企業）
求人媒体以外の特定施設・企業を**単体で**検索している。
- 病院、クリニック、介護施設、企業名等（求人・採用なし）
- 例: 「聖路加国際病院」「ベネッセスタイルケア」「グリーン歯科」
- **重要**: これは求人媒体のSEO対策対象外のため、迷ったらinformationalで可

### 5. branded_ambiguous（指名検索：曖昧）
固有名詞だが、同名の複数組織が存在し特定困難。
- 「れいんぼー」「charom」等、同名の施設が複数存在
- **迷ったらinformationalで可**（Web検索コスト削減のため）

### 6. b2b（法人向け）
採用担当者・経営者が検索するキーワード。
- 処遇改善加算、採用単価、開業費用、人材紹介手数料等

## 重要なルール

1. **「求人」「転職」「募集」「採用」「バイト」「パート」を含む → transactional**
2. **固有名詞 + 求人系ワード → transactional**（branded_customerにならない）
3. **迷ったらinformational**（安全側に倒す）
4. branded_customerとbranded_ambiguousは慎重に（これらはWeb検索で再検証される可能性がある）

回答は必ず以下のJSON形式で返してください：
[
  {"keyword": "キーワード", "intent": "transactional|informational|branded_media|branded_customer|branded_ambiguous|b2b", "reason": "分類理由（20文字以内）"},
  ...
]`

  const userPrompt = `以下の${keywords.length}件のキーワードを分類してください。

【重要】
- これらはルールベース判定で分類できなかったキーワードです
- 迷ったらinformationalを選択してください
- branded_customer/branded_ambiguousは本当に確信がある場合のみ

${keywordList}

JSON配列のみを返してください。`

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('JSON not found in response')
    }

    const classifications = JSON.parse(jsonMatch[0]) as Array<{
      keyword: string
      intent: string
      reason: string
    }>

    const validIntents: QueryIntent[] = [
      'branded_media', 'branded_customer', 'branded_ambiguous',
      'transactional', 'informational', 'b2b'
    ]

    for (const item of classifications) {
      const intent = item.intent as QueryIntent
      if (validIntents.includes(intent)) {
        results.set(item.keyword, {
          intent,
          confidence: 'high',
          reason: item.reason,
          queryType: getQueryTypeFromIntent(intent),  // intentからqueryTypeを導出
          serpVerified: false,
        })
      }
    }

    for (const keyword of keywords) {
      if (!results.has(keyword)) {
        results.set(keyword, {
          intent: 'informational',
          confidence: 'low',
          reason: 'AI分類失敗',
          queryType: 'Know',  // informationalのデフォルト
          serpVerified: false,
        })
      }
    }
  } catch (error) {
    // 詳細なエラー情報をログ
    let errorMessage = ''
    if (error instanceof Anthropic.APIError) {
      const fullError = JSON.stringify(error.error)
      errorMessage = `${error.status}: ${fullError}`
      console.error('[classifyBatchWithClaude] API Error FULL:', {
        status: error.status,
        message: error.message,
        headers: error.headers,
        errorFull: fullError,
      })
    } else {
      errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      console.error('[classifyBatchWithClaude] Error:', errorMessage)
    }

    for (const keyword of keywords) {
      results.set(keyword, {
        intent: 'informational',
        confidence: 'low',
        reason: `分類エラー: ${errorMessage.slice(0, 200)}`,
        queryType: 'Know',  // エラー時のデフォルト
        serpVerified: false,
      })
    }
  }

  return results
}

/**
 * ハイブリッド分類（v2）: 3層構造
 *
 * Layer 1: ルールベース判定（無料・高速）
 *   - プロンプト08の50+パターンで70-80%をカバー
 *
 * Layer 2: AI判定（低コスト・Web検索なし）
 *   - ルールで判定できなかったキーワードをAIで分類
 *   - branded_ambiguousと判定された場合のみLayer 3へ
 *
 * Layer 3: Web検索検証（高コスト・最小限使用）
 *   - branded_ambiguousのみWeb検索で検証
 *   - コスト削減のため使用を最小限に
 */
export async function classifyWithHybrid(
  keywords: string[]
): Promise<Map<string, IntentClassification>> {
  const results = new Map<string, IntentClassification>()
  const needAIKeywords: string[] = []

  // ===========================================
  // Layer 1: ルールベース判定
  // ===========================================
  for (const keyword of keywords) {
    const ruleResult = classifyByRule(keyword)

    if (ruleResult.classification && !ruleResult.needsAI) {
      // ルールで確定（classification_source: 'rule'として区別可能）
      results.set(keyword, {
        ...ruleResult.classification,
        serpVerified: false,
      })
    } else {
      // Layer 2へ
      needAIKeywords.push(keyword)
    }
  }

  console.log(`[classifyWithHybrid] Layer 1 ルール確定: ${results.size}件, Layer 2 AI判定必要: ${needAIKeywords.length}件`)

  // ===========================================
  // Layer 2: AI判定（Web検索なし）
  // ===========================================
  if (needAIKeywords.length > 0) {
    const aiResults = await classifyWithClaude(needAIKeywords)
    const needWebSearchKeywords: string[] = []

    aiResults.forEach((classification, keyword) => {
      // branded_ambiguousの場合のみLayer 3へ
      if (classification.intent === 'branded_ambiguous') {
        needWebSearchKeywords.push(keyword)
      } else {
        results.set(keyword, {
          ...classification,
          serpVerified: false,
        })
      }
    })

    console.log(`[classifyWithHybrid] Layer 2 AI確定: ${aiResults.size - needWebSearchKeywords.length}件, Layer 3 Web検索必要: ${needWebSearchKeywords.length}件`)

    // ===========================================
    // Layer 3: Web検索検証（branded_ambiguousのみ）
    // ===========================================
    if (needWebSearchKeywords.length > 0) {
      try {
        const webResults = await classifyWithWebSearch(needWebSearchKeywords)
        webResults.forEach((classification, keyword) => {
          results.set(keyword, classification)
        })
        console.log(`[classifyWithHybrid] Layer 3 Web検索完了: ${needWebSearchKeywords.length}件`)
      } catch (error) {
        console.error('[classifyWithHybrid] Layer 3 Web検索エラー、informationalにフォールバック:', error)
        // Web検索失敗時はinformationalにフォールバック
        for (const keyword of needWebSearchKeywords) {
          results.set(keyword, {
            intent: 'informational',
            confidence: 'low',
            reason: 'Web検索エラー、フォールバック',
            queryType: 'Know',  // informationalのデフォルト
            serpVerified: false,
          })
        }
      }
    }
  }

  // 統計ログ
  const stats = {
    total: keywords.length,
    rule: 0,
    ai: 0,
    webSearch: 0,
  }
  results.forEach((classification) => {
    if (classification.serpVerified) {
      stats.webSearch++
    } else if (classification.reason?.includes('AI')) {
      stats.ai++
    } else {
      stats.rule++
    }
  })
  console.log(`[classifyWithHybrid] 完了 - ルール: ${stats.rule}件, AI: ${stats.ai}件, Web検索: ${stats.webSearch}件`)

  return results
}

// ===========================================
// 後方互換性のための非推奨関数
// ===========================================

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function loadMediaNames(): Promise<never[]> {
  console.warn('loadMediaNames is deprecated. Media name detection is now handled by AI + Web Search.')
  return Promise.resolve([])
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function getMediaNamesSync(): never[] {
  console.warn('getMediaNamesSync is deprecated. Media name detection is now handled by AI + Web Search.')
  return []
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function clearMediaNameCache(): void {
  console.warn('clearMediaNameCache is deprecated. No cache exists.')
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addMediaName(name: string): void {
  console.warn('addMediaName is deprecated. Media name detection is now handled by AI + Web Search.')
}

/**
 * @deprecated 媒体名リストは使用しない設計に変更
 */
export function getMediaNames(): string[] {
  console.warn('getMediaNames is deprecated. Media name detection is now handled by AI + Web Search.')
  return []
}

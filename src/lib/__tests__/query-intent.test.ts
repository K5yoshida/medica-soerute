/**
 * query-intent.ts のユニットテスト
 *
 * Layer 1（ルールベース判定）のテストを中心に
 * プロンプト08のルールが正しく実装されているか検証
 */

import { describe, it, expect } from 'vitest'
import { classifyQueryIntent, classifyQueryType } from '../query-intent'

describe('classifyQueryIntent - Layer 1 ルールベース判定', () => {
  // ===========================================
  // Step 1: B2B判定
  // ===========================================
  describe('B2B判定', () => {
    it.each([
      ['処遇改善加算 計算方法', 'b2b'],
      ['介護報酬 2024', 'b2b'],
      ['採用単価 相場', 'b2b'],
      ['開業資金 歯科', 'b2b'],
      ['人材紹介手数料', 'b2b'],
      ['有効求人倍率 介護', 'b2b'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 2: 媒体名判定（branded_media）
  // ===========================================
  describe('媒体名判定', () => {
    it.each([
      // 媒体名のみ → branded_media
      ['Indeed', 'branded_media'],
      ['ジョブメドレー', 'branded_media'],
      ['求人ボックス', 'branded_media'],  // 重要: 「求人」より先にチェック
      ['タイミー', 'branded_media'],
      ['ハローワーク', 'branded_media'],
      // 媒体名 + 求人系 → transactional
      ['Indeed 求人', 'transactional'],
      ['ジョブメドレー 転職', 'transactional'],
      ['求人ボックス 募集', 'transactional'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 3: 書類・面接関連（informational優先）
  // ===========================================
  describe('書類・面接関連', () => {
    it.each([
      ['履歴書 看護師', 'informational'],
      ['職務経歴書 薬剤師', 'informational'],
      ['志望動機 介護職', 'informational'],
      ['自己PR 転職', 'informational'],
      ['本人希望記入欄 バイト', 'informational'],  // バイトが含まれていてもinformational
      ['面接 質問 アルバイト', 'informational'],
      ['面接 対策 看護師', 'informational'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 4: 転職ノウハウパターン
  // ===========================================
  describe('転職ノウハウパターン', () => {
    it.each([
      ['50代からの転職', 'informational'],
      ['40歳からの仕事', 'informational'],
      ['30代からの転職 女性', 'informational'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 5: 「〜とは」パターン
  // ===========================================
  describe('「〜とは」パターン', () => {
    it.each([
      ['副業とは', 'informational'],
      ['在宅ワークとは', 'informational'],
      ['ケアマネとは', 'informational'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 6: Transactionalパターン
  // ===========================================
  describe('Transactionalパターン', () => {
    it.each([
      ['看護師 求人', 'transactional'],
      ['介護職 募集', 'transactional'],
      ['薬剤師 転職', 'transactional'],
      ['歯科助手 バイト', 'transactional'],
      ['医療事務 パート', 'transactional'],
      ['内職 自宅', 'transactional'],
      ['仕事探し 大阪', 'transactional'],
      ['正社員 介護', 'transactional'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 7: 地名 + 雇用形態
  // ===========================================
  describe('地名 + 雇用形態', () => {
    it.each([
      ['可児市 パート', 'transactional'],
      ['宇治市 パート', 'transactional'],
      ['福岡市 バイト', 'transactional'],
      ['名古屋 正社員', 'transactional'],
      ['横浜 派遣', 'transactional'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 8: 地名 + 職種名
  // ===========================================
  describe('地名 + 職種名', () => {
    // 都道府県試験型 → informational
    it.each([
      ['福岡 登録販売者', 'informational'],
      ['東京 ケアマネ', 'informational'],
    ])('都道府県試験型: "%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })

    // 一般職種 → transactional
    it.each([
      ['看護師 福岡', 'transactional'],
      ['東京 看護師', 'transactional'],
      ['保育士 鹿児島', 'transactional'],
      ['歯科衛生士 大阪', 'transactional'],
      ['理学療法士 福岡', 'transactional'],
      ['ケアマネージャー 東京', 'transactional'],  // 長音あり → transactional
    ])('一般職種: "%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // Step 9: Informationalパターン
  // ===========================================
  describe('Informationalパターン', () => {
    it.each([
      ['看護師 年収', 'informational'],
      ['介護職 仕事内容', 'informational'],
      ['ケアマネ 試験 難易度', 'informational'],
      ['作業療法士 なるには', 'informational'],
      ['理学療法士 作業療法士 違い', 'informational'],
      ['介護職 きつい', 'informational'],
      ['歯科衛生士 ブランク 復帰', 'informational'],
    ])('"%s" → %s', (keyword, expectedIntent) => {
      const result = classifyQueryIntent(keyword)
      expect(result.intent).toBe(expectedIntent)
    })
  })

  // ===========================================
  // 空文字・エッジケース
  // ===========================================
  describe('エッジケース', () => {
    it('空文字 → informational (low confidence)', () => {
      const result = classifyQueryIntent('')
      expect(result.intent).toBe('informational')
      expect(result.confidence).toBe('low')
    })

    it('スペースのみ → informational (low confidence)', () => {
      const result = classifyQueryIntent('   ')
      expect(result.intent).toBe('informational')
      expect(result.confidence).toBe('low')
    })
  })
})

describe('classifyQueryType', () => {
  it.each([
    ['応募 方法', 'Do'],
    ['エントリー 看護師', 'Do'],
    ['マイページ ログイン', 'Go'],
    ['Indeed 公式', 'Go'],
    ['おすすめ 転職サイト', 'Buy'],
    ['比較 求人サイト', 'Buy'],
    ['看護師 年収', 'Know'],
    ['介護職 仕事内容', 'Know'],
  ])('"%s" → %s', (keyword, expectedType) => {
    const result = classifyQueryType(keyword)
    expect(result).toBe(expectedType)
  })
})

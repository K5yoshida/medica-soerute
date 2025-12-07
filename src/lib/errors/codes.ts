/**
 * エラーコード定義
 *
 * 設計書: 19_エラーカタログと監視ポリシー - 19.2 エラーコード体系
 *
 * 命名規則: E-{カテゴリ}-{連番}
 *
 * カテゴリ:
 * - AUTH: 認証・認可関連
 * - VALID: バリデーション関連
 * - LIMIT: 利用制限関連
 * - EXT: 外部サービス関連
 * - DATA: データ操作関連
 * - SYS: システム関連
 */

/**
 * エラーコードの型定義
 */
export type ErrorCode =
  // 認証・認可エラー (AUTH)
  | 'E-AUTH-001'
  | 'E-AUTH-002'
  | 'E-AUTH-003'
  | 'E-AUTH-004'
  | 'E-AUTH-005'
  | 'E-AUTH-006'
  | 'E-AUTH-007'
  | 'E-AUTH-008'
  | 'E-AUTH-009'
  | 'E-AUTH-010'
  // バリデーションエラー (VALID)
  | 'E-VALID-001'
  | 'E-VALID-002'
  | 'E-VALID-003'
  | 'E-VALID-004'
  | 'E-VALID-005'
  | 'E-VALID-006'
  | 'E-VALID-007'
  | 'E-VALID-008'
  | 'E-VALID-009'
  | 'E-VALID-010'
  // 利用制限エラー (LIMIT)
  | 'E-LIMIT-001'
  | 'E-LIMIT-002'
  | 'E-LIMIT-003'
  | 'E-LIMIT-004'
  | 'E-LIMIT-005'
  | 'E-LIMIT-006'
  // 外部サービスエラー (EXT)
  | 'E-EXT-001'
  | 'E-EXT-002'
  | 'E-EXT-003'
  | 'E-EXT-004'
  | 'E-EXT-005'
  | 'E-EXT-006'
  | 'E-EXT-007'
  | 'E-EXT-008'
  | 'E-EXT-009'
  | 'E-EXT-010'
  // データ操作エラー (DATA)
  | 'E-DATA-001'
  | 'E-DATA-002'
  | 'E-DATA-003'
  | 'E-DATA-004'
  | 'E-DATA-005'
  | 'E-DATA-006'
  | 'E-DATA-007'
  | 'E-DATA-010'
  | 'E-DATA-011'
  | 'E-DATA-012'
  | 'E-DATA-013'
  | 'E-DATA-014'
  | 'E-DATA-015'
  | 'E-DATA-016'
  | 'E-DATA-017'
  // システムエラー (SYS)
  | 'E-SYS-001'
  | 'E-SYS-002'
  | 'E-SYS-003'
  | 'E-SYS-004'
  | 'E-SYS-005'

/**
 * エラー定義
 */
interface ErrorDefinition {
  code: ErrorCode
  httpStatus: number
  message: string
}

/**
 * エラーカタログ
 */
export const ERROR_CATALOG: Record<ErrorCode, ErrorDefinition> = {
  // ===== 認証・認可エラー (AUTH) =====
  'E-AUTH-001': {
    code: 'E-AUTH-001',
    httpStatus: 401,
    message: '認証が必要です',
  },
  'E-AUTH-002': {
    code: 'E-AUTH-002',
    httpStatus: 401,
    message: 'セッションが期限切れです',
  },
  'E-AUTH-003': {
    code: 'E-AUTH-003',
    httpStatus: 401,
    message: '無効な認証トークンです',
  },
  'E-AUTH-004': {
    code: 'E-AUTH-004',
    httpStatus: 401,
    message: 'メールアドレスまたはパスワードが正しくありません',
  },
  'E-AUTH-005': {
    code: 'E-AUTH-005',
    httpStatus: 401,
    message: 'アカウントがロックされています',
  },
  'E-AUTH-006': {
    code: 'E-AUTH-006',
    httpStatus: 403,
    message: 'この操作を行う権限がありません',
  },
  'E-AUTH-007': {
    code: 'E-AUTH-007',
    httpStatus: 403,
    message: 'このリソースへのアクセス権限がありません',
  },
  'E-AUTH-008': {
    code: 'E-AUTH-008',
    httpStatus: 400,
    message: '無効な招待トークンです',
  },
  'E-AUTH-009': {
    code: 'E-AUTH-009',
    httpStatus: 400,
    message: 'このメールアドレスは既に登録されています',
  },
  'E-AUTH-010': {
    code: 'E-AUTH-010',
    httpStatus: 400,
    message: 'パスワードリセットトークンが無効です',
  },

  // ===== バリデーションエラー (VALID) =====
  'E-VALID-001': {
    code: 'E-VALID-001',
    httpStatus: 422,
    message: '入力内容に誤りがあります',
  },
  'E-VALID-002': {
    code: 'E-VALID-002',
    httpStatus: 422,
    message: '必須項目が入力されていません',
  },
  'E-VALID-003': {
    code: 'E-VALID-003',
    httpStatus: 422,
    message: 'メールアドレスの形式が正しくありません',
  },
  'E-VALID-004': {
    code: 'E-VALID-004',
    httpStatus: 422,
    message: 'パスワードは8文字以上で入力してください',
  },
  'E-VALID-005': {
    code: 'E-VALID-005',
    httpStatus: 422,
    message: 'URLの形式が正しくありません',
  },
  'E-VALID-006': {
    code: 'E-VALID-006',
    httpStatus: 422,
    message: 'ファイルサイズが上限を超えています',
  },
  'E-VALID-007': {
    code: 'E-VALID-007',
    httpStatus: 422,
    message: 'サポートされていないファイル形式です',
  },
  'E-VALID-008': {
    code: 'E-VALID-008',
    httpStatus: 422,
    message: 'CSVの形式が正しくありません',
  },
  'E-VALID-009': {
    code: 'E-VALID-009',
    httpStatus: 422,
    message: '選択されたクエリ数が上限を超えています',
  },
  'E-VALID-010': {
    code: 'E-VALID-010',
    httpStatus: 422,
    message: '日付の形式が正しくありません',
  },

  // ===== 利用制限エラー (LIMIT) =====
  'E-LIMIT-001': {
    code: 'E-LIMIT-001',
    httpStatus: 403,
    message: '月間利用上限に達しました',
  },
  'E-LIMIT-002': {
    code: 'E-LIMIT-002',
    httpStatus: 403,
    message: '保存件数の上限に達しました',
  },
  'E-LIMIT-003': {
    code: 'E-LIMIT-003',
    httpStatus: 403,
    message: 'チームメンバー数の上限に達しました',
  },
  'E-LIMIT-004': {
    code: 'E-LIMIT-004',
    httpStatus: 429,
    message: 'リクエスト回数が上限を超えました',
  },
  'E-LIMIT-005': {
    code: 'E-LIMIT-005',
    httpStatus: 403,
    message: 'この機能はご利用のプランではお使いいただけません',
  },
  'E-LIMIT-006': {
    code: 'E-LIMIT-006',
    httpStatus: 403,
    message: '無料トライアル期間が終了しました',
  },

  // ===== 外部サービスエラー (EXT) =====
  'E-EXT-001': {
    code: 'E-EXT-001',
    httpStatus: 503,
    message: 'AI分析サービスが一時的に利用できません',
  },
  'E-EXT-002': {
    code: 'E-EXT-002',
    httpStatus: 503,
    message: 'AI分析がタイムアウトしました',
  },
  'E-EXT-003': {
    code: 'E-EXT-003',
    httpStatus: 503,
    message: 'AI分析の処理上限に達しました',
  },
  'E-EXT-004': {
    code: 'E-EXT-004',
    httpStatus: 503,
    message: '決済サービスが一時的に利用できません',
  },
  'E-EXT-005': {
    code: 'E-EXT-005',
    httpStatus: 400,
    message: '決済処理に失敗しました',
  },
  'E-EXT-006': {
    code: 'E-EXT-006',
    httpStatus: 400,
    message: 'カード情報が無効です',
  },
  'E-EXT-007': {
    code: 'E-EXT-007',
    httpStatus: 400,
    message: 'カードの有効期限が切れています',
  },
  'E-EXT-008': {
    code: 'E-EXT-008',
    httpStatus: 503,
    message: 'メール送信に失敗しました',
  },
  'E-EXT-009': {
    code: 'E-EXT-009',
    httpStatus: 503,
    message: '対象URLにアクセスできませんでした',
  },
  'E-EXT-010': {
    code: 'E-EXT-010',
    httpStatus: 503,
    message: '対象URLのページが見つかりませんでした',
  },

  // ===== データ操作エラー (DATA) =====
  'E-DATA-001': {
    code: 'E-DATA-001',
    httpStatus: 404,
    message: '指定されたデータが見つかりません',
  },
  'E-DATA-002': {
    code: 'E-DATA-002',
    httpStatus: 409,
    message: 'データが他のユーザーによって更新されました',
  },
  'E-DATA-003': {
    code: 'E-DATA-003',
    httpStatus: 409,
    message: 'このデータは既に存在します',
  },
  'E-DATA-004': {
    code: 'E-DATA-004',
    httpStatus: 400,
    message: 'このデータは削除できません',
  },
  'E-DATA-005': {
    code: 'E-DATA-005',
    httpStatus: 400,
    message: 'インポートデータに重複があります',
  },
  'E-DATA-006': {
    code: 'E-DATA-006',
    httpStatus: 500,
    message: 'データの保存に失敗しました',
  },
  'E-DATA-007': {
    code: 'E-DATA-007',
    httpStatus: 500,
    message: 'データの読み込みに失敗しました',
  },
  'E-DATA-010': {
    code: 'E-DATA-010',
    httpStatus: 404,
    message: '指定されたジョブが見つかりません',
  },
  'E-DATA-011': {
    code: 'E-DATA-011',
    httpStatus: 400,
    message: 'このジョブはキャンセルできません',
  },
  'E-DATA-012': {
    code: 'E-DATA-012',
    httpStatus: 400,
    message: 'このジョブはリトライできません',
  },
  'E-DATA-013': {
    code: 'E-DATA-013',
    httpStatus: 400,
    message: 'CSV解析に失敗しました',
  },
  'E-DATA-014': {
    code: 'E-DATA-014',
    httpStatus: 400,
    message: 'キーワード列が見つかりません',
  },
  'E-DATA-015': {
    code: 'E-DATA-015',
    httpStatus: 500,
    message: 'インポート処理中にエラーが発生しました',
  },
  'E-DATA-016': {
    code: 'E-DATA-016',
    httpStatus: 500,
    message: 'AI分類処理に失敗しました',
  },
  'E-DATA-017': {
    code: 'E-DATA-017',
    httpStatus: 400,
    message: 'ファイルの取得に失敗しました',
  },

  // ===== システムエラー (SYS) =====
  'E-SYS-001': {
    code: 'E-SYS-001',
    httpStatus: 500,
    message: 'システムエラーが発生しました',
  },
  'E-SYS-002': {
    code: 'E-SYS-002',
    httpStatus: 503,
    message: 'サービスが一時的に利用できません',
  },
  'E-SYS-003': {
    code: 'E-SYS-003',
    httpStatus: 500,
    message: '設定エラーが発生しました',
  },
  'E-SYS-004': {
    code: 'E-SYS-004',
    httpStatus: 500,
    message: '内部通信エラーが発生しました',
  },
  'E-SYS-005': {
    code: 'E-SYS-005',
    httpStatus: 504,
    message: 'リクエストがタイムアウトしました',
  },
}

/**
 * エラーコードからエラー定義を取得
 */
export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ERROR_CATALOG[code]
}

/**
 * HTTPステータスコードからデフォルトのエラーコードを取得
 */
export function getDefaultErrorCode(httpStatus: number): ErrorCode {
  switch (httpStatus) {
    case 400:
      return 'E-VALID-001'
    case 401:
      return 'E-AUTH-001'
    case 403:
      return 'E-AUTH-006'
    case 404:
      return 'E-DATA-001'
    case 409:
      return 'E-DATA-003'
    case 422:
      return 'E-VALID-001'
    case 429:
      return 'E-LIMIT-004'
    case 503:
      return 'E-SYS-002'
    case 504:
      return 'E-SYS-005'
    default:
      return 'E-SYS-001'
  }
}

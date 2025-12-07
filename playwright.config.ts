// ===========================================
// Playwright E2E Test Configuration
// ===========================================
//
// 設計書: 20_テスト計画と品質ゲート - 20.3 E2Eテスト
//
// 対象: クリティカルユーザーフロー
// - 認証フロー（ログイン、サインアップ）
// - マッチング分析フロー
// - PESO診断フロー

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // テストディレクトリ
  testDir: './e2e',

  // 並列実行（CI環境では無効化）
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // レポーター設定
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['github']]
    : [['html', { open: 'never' }], ['list']],

  // グローバル設定
  use: {
    // ベースURL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // トレース収集（失敗時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'on-first-retry',
  },

  // プロジェクト（ブラウザ設定）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // モバイルビューポートでのテスト（オプション）
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 開発サーバー自動起動
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // テスト用環境変数（必要に応じて設定）
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key',
    },
  },
})

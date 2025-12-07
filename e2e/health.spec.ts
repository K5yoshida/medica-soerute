// ===========================================
// E2E Test: ヘルスチェック・基本動作確認
// ===========================================
//
// 設計書: 20_テスト計画と品質ゲート - 20.3 E2Eテスト

import { test, expect } from '@playwright/test'

test.describe('ヘルスチェック', () => {
  test('トップページが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/MEDICA SOERUTE|メディカソエルテ/)
  })

  test('ヘルスチェックAPIが正常レスポンスを返す', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('ok')
    expect(data.timestamp).toBeDefined()
  })
})

test.describe('認証ページ', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /ログイン/ })).toBeVisible()
  })

  test('サインアップページが表示される', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('heading', { name: /アカウント作成|新規登録/ })).toBeVisible()
  })

  test('未認証でダッシュボードにアクセスするとログインにリダイレクト', async ({ page }) => {
    await page.goto('/dashboard')
    // リダイレクトを待つ
    await page.waitForURL(/\/auth\/login/)
    expect(page.url()).toContain('/auth/login')
  })
})

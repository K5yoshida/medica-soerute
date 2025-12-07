/**
 * ユーティリティ関数のテスト
 *
 * テスト対象: src/lib/utils.ts
 * - cn: classnames結合関数
 */
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn (classnames utility)', () => {
  // テスト36: 単一のクラス名を返す
  it('should return single class name', () => {
    expect(cn('foo')).toBe('foo')
  })

  // テスト37: 複数のクラス名を結合する
  it('should merge multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  // テスト38: 条件付きクラス名をサポートする
  it('should handle conditional class names', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  // テスト39: Tailwindの競合するクラスをマージする
  it('should merge conflicting Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  // テスト40: undefinedやnullを無視する
  it('should ignore undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  // テスト41: 空の入力で空文字を返す
  it('should return empty string for empty input', () => {
    expect(cn()).toBe('')
  })

  // テスト42: オブジェクト形式の条件を処理する
  it('should handle object conditions', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  // テスト43: 配列形式のクラスを処理する
  it('should handle array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  // テスト44: Tailwindのpaddingクラスを正しくマージする
  it('should correctly merge Tailwind padding classes', () => {
    expect(cn('p-2 pt-4', 'pt-6')).toBe('p-2 pt-6')
  })

  // テスト45: Tailwindのbackgroundクラスを正しくマージする
  it('should correctly merge Tailwind background classes', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })
})

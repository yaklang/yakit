import { describe, expect, it } from 'vitest'
import { normalizeRemotePath } from '../remotePath'

describe('normalizeRemotePath', () => {
  it('normalizes POSIX paths without depending on the Yakit host OS', () => {
    expect(normalizeRemotePath('/var/www/../tmp//index.php')).toBe('/var/tmp/index.php')
    expect(normalizeRemotePath('uploads/./images/../avatar.png')).toBe('uploads/avatar.png')
  })

  it('normalizes Windows drive paths using the target separator', () => {
    expect(normalizeRemotePath('C:\\Users\\alice\\..\\bob\\file.txt')).toBe('C:\\Users\\bob\\file.txt')
    expect(normalizeRemotePath('C:/Users/alice/../bob/file.txt')).toBe('C:\\Users\\bob\\file.txt')
  })

  it('keeps the UNC server and share as a non-escapable root', () => {
    expect(normalizeRemotePath('\\\\server\\share\\folder\\..\\file.txt')).toBe('\\\\server\\share\\file.txt')
  })

  it('preserves meaningful parent segments for relative paths', () => {
    expect(normalizeRemotePath('a/../../b')).toBe('../b')
    expect(normalizeRemotePath('')).toBe('.')
  })
})

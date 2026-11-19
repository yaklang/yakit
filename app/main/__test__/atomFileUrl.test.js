// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { filePathFromAtomUrl } from '../atomFileUrl'

describe('atom file URLs', () => {
  it('restores a Windows drive letter that Chromium parsed as the host on win32', () => {
    expect(filePathFromAtomUrl('atom://c/Users/foo/bar.png', 'win32')).toBe('c:/Users/foo/bar.png')
    expect(filePathFromAtomUrl('atom://C:\\Users\\foo\\bar.png', 'win32')).toBe('C:/Users/foo/bar.png')
  })

  it('reads slash-prefixed Windows paths on win32 and preserves POSIX paths on POSIX platforms', () => {
    expect(filePathFromAtomUrl('atom:///C:/Users/foo/bar.png', 'win32')).toBe('C:/Users/foo/bar.png')
    expect(filePathFromAtomUrl('atom:///Users/foo/bar.png', 'linux')).toBe('/Users/foo/bar.png')
    expect(filePathFromAtomUrl('atom:///C:/foo.png', 'linux')).toBe('/C:/foo.png')
    expect(filePathFromAtomUrl('atom:///C%3A/foo.png', 'darwin')).toBe('/C:/foo.png')
    expect(filePathFromAtomUrl('atom:///Users/foo/a%5Cb.png', 'linux')).toBe('/Users/foo/a\\b.png')
  })

  it('decodes characters in the file name once', () => {
    expect(filePathFromAtomUrl('atom:///C:/Users/foo/my%20file.png', 'win32')).toBe('C:/Users/foo/my file.png')
    expect(filePathFromAtomUrl('atom:///C%3A/Users/foo/100%2520.png', 'win32')).toBe('C:/Users/foo/100%20.png')
    expect(filePathFromAtomUrl('atom:///C%3A/Users/foo/a%23b%3F.png', 'win32')).toBe('C:/Users/foo/a#b?.png')
    expect(filePathFromAtomUrl('atom:////server/share/a.png', 'win32')).toBe('//server/share/a.png')
  })
})

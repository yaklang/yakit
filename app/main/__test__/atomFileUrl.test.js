// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { filePathFromAtomUrl } from '../atomFileUrl'

describe('atom file URLs', () => {
  it('restores a Windows drive letter that Chromium parsed as the host', () => {
    expect(filePathFromAtomUrl('atom://c/Users/foo/bar.png')).toBe('c:/Users/foo/bar.png')
    expect(filePathFromAtomUrl('atom://C:\\Users\\foo\\bar.png')).toBe('C:/Users/foo/bar.png')
  })

  it('reads a slash-prefixed Windows path and a POSIX path', () => {
    expect(filePathFromAtomUrl('atom:///C:/Users/foo/bar.png')).toBe('C:/Users/foo/bar.png')
    expect(filePathFromAtomUrl('atom:///Users/foo/bar.png')).toBe('/Users/foo/bar.png')
  })

  it('decodes characters in the file name once', () => {
    expect(filePathFromAtomUrl('atom:///C:/Users/foo/my%20file.png')).toBe('C:/Users/foo/my file.png')
    expect(filePathFromAtomUrl('atom:///C%3A/Users/foo/100%2520.png')).toBe('C:/Users/foo/100%20.png')
    expect(filePathFromAtomUrl('atom:///C%3A/Users/foo/a%23b%3F.png')).toBe('C:/Users/foo/a#b?.png')
    expect(filePathFromAtomUrl('atom:////server/share/a.png')).toBe('//server/share/a.png')
  })
})

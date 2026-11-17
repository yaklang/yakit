import { describe, expect, it } from 'vitest'
import { toAtomFileUrl } from '../atomFileUrl'

describe('toAtomFileUrl', () => {
  it('keeps a Windows drive letter inside the path', () => {
    expect(toAtomFileUrl('C:\\Users\\foo\\bar.png')).toBe('atom:///C%3A/Users/foo/bar.png')
  })

  it('keeps a POSIX path unchanged aside from the atom scheme', () => {
    expect(toAtomFileUrl('/Users/foo/bar.png')).toBe('atom:///Users/foo/bar.png')
  })

  it('keeps a UNC path and encodes characters that would break a URL', () => {
    expect(toAtomFileUrl('\\\\server\\share\\a.png')).toBe('atom:////server/share/a.png')
    expect(toAtomFileUrl('C:\\Users\\foo\\100%20.png')).toBe('atom:///C%3A/Users/foo/100%2520.png')
    expect(toAtomFileUrl('C:\\Users\\foo\\a#b?.png')).toBe('atom:///C%3A/Users/foo/a%23b%3F.png')
  })
})

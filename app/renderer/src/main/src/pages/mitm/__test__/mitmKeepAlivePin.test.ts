import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mitmPage = readFileSync(join(root, 'MITMPage.tsx'), 'utf8')
const httpHacker = readFileSync(join(root, '../hacker/httpHacker.tsx'), 'utf8')
const mitmHacker = readFileSync(join(root, 'MITMHacker/MITMHacker.tsx'), 'utf8')

describe('MITM keep-alive pin wiring', () => {
  it('pins the context route after reading MITMContext (V1/V2 hosts share MITMPage)', () => {
    const contextAt = mitmPage.indexOf('const mitmContent = useContext(MITMContext)')
    const pinAt = mitmPage.indexOf('pinKeepAlive(mitmContent.mitmStore.route)')
    expect(contextAt).toBeGreaterThan(-1)
    expect(pinAt).toBeGreaterThan(contextAt)
    expect(mitmPage).not.toMatch(/pinKeepAlive\(\s*YakitRoute\.MITMHacker\s*\)/)
    expect(mitmPage).toMatch(/if \(status === 'idle'\) return/)
  })

  it('V1/V2 hosts publish distinct routes that match their page tab pin ids', () => {
    expect(httpHacker).toMatch(/route:\s*YakitRoute\.HTTPHacker/)
    expect(mitmHacker).toMatch(/route:\s*YakitRoute\.MITMHacker/)
  })
})

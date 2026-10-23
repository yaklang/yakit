import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('Fuzzer keep-alive pin wiring', () => {
  it('HTTPFuzzerPage pins page id + HTTPFuzzer route while sending', () => {
    const text = readFileSync(join(srcRoot, 'pages/fuzzer/HTTPFuzzerPage.tsx'), 'utf8')
    expect(text).toContain('pinKeepAlive(props.id)')
    expect(text).toContain('pinKeepAlive(YakitRoute.HTTPFuzzer)')
    expect(text).toMatch(/isbuttonIsSendReqStatus/)
  })

  it('FuzzerSequence pins group id + HTTPFuzzer route while loading', () => {
    const text = readFileSync(join(srcRoot, 'pages/fuzzer/FuzzerSequence/FuzzerSequence.tsx'), 'utf8')
    expect(text).toContain('pinKeepAlive(propsGroupId)')
    expect(text).toContain('pinKeepAlive(YakitRoute.HTTPFuzzer)')
  })
})

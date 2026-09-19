import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(path, 'utf8')

describe('React 19 JSX renderers', () => {
  it.each([
    [
      'engine startup agreement',
      'app/renderer/engine-link-startup/src/pages/StartupPage/components/YakitLoading/index.tsx',
      'agreement',
    ],
    ['CVE update hint content', 'app/renderer/src/main/src/pages/cve/CVETable.tsx', 'HintContent'],
    [
      'form dragger content',
      'app/renderer/src/main/src/components/yakitUI/YakitForm/YakitForm.tsx',
      'renderContentValue',
    ],
  ])('does not create %s with useMemoizedFn', (_name, path, rendererName) => {
    const source = readSource(path)
    expect(source).not.toMatch(new RegExp(`const\\s+${rendererName}\\s*=\\s*useMemoizedFn`))
  })
})
